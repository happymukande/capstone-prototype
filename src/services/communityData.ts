import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppRole } from '../context/RoleContext';
import { ProgressMap } from './progressStorage';

const SURVEYS_KEY = 'capstone.reviewSurveys.v1';
const REVIEW_RESPONSES_KEY = 'capstone.reviewResponses.v1';
const CHAT_MESSAGES_KEY = 'capstone.communityChat.v1';
const PLATFORM_USERS_KEY = 'capstone.platformUsers.v1';
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export type ReviewQuestion = {
  id: string;
  prompt: string;
};

export type ReviewSurvey = {
  id: string;
  title: string;
  description: string;
  questions: ReviewQuestion[];
  status: 'draft' | 'published';
  createdAt: string;
  publishedAt?: string;
};

export type ReviewResponse = {
  id: string;
  surveyId: string;
  surveyTitle: string;
  userId: string;
  username: string;
  answers: Record<string, string>;
  stars: number;
  submittedAt: string;
};

export type ChatMessage = {
  id: string;
  userId: string;
  username: string;
  body: string;
  createdAt: string;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
};

export type PlatformUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: AppRole;
  isGuest: boolean;
  createdAt: string;
  lastSeenAt: string;
  coursesTaken: string[];
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeList<T>(key: string, value: T[]) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function getDisplayName(user: any) {
  return (
    user?.user_metadata?.username?.trim?.() ||
    user?.user_metadata?.full_name?.trim?.() ||
    user?.email?.split('@')[0] ||
    'Guest learner'
  );
}

export function getCoursesTaken(progressMap: ProgressMap) {
  return Object.entries(progressMap)
    .filter(([, progress]) => progress.started || progress.completed || progress.openedCount > 0)
    .map(([lessonId]) => lessonId);
}

export function isUserOnline(user: PlatformUser, now = Date.now()) {
  return now - new Date(user.lastSeenAt).getTime() <= ONLINE_WINDOW_MS;
}

export async function loadReviewSurveys() {
  const surveys = await readList<ReviewSurvey>(SURVEYS_KEY);
  return surveys.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function loadPublishedSurvey() {
  const surveys = await loadReviewSurveys();
  return surveys.find((survey) => survey.status === 'published') ?? null;
}

export async function saveReviewSurvey(input: {
  title: string;
  description: string;
  questions: string[];
  publish?: boolean;
}) {
  const now = new Date().toISOString();
  const survey: ReviewSurvey = {
    id: makeId('survey'),
    title: input.title.trim() || 'App Review',
    description: input.description.trim(),
    questions: input.questions
      .map((prompt) => prompt.trim())
      .filter(Boolean)
      .map((prompt) => ({ id: makeId('question'), prompt })),
    status: input.publish ? 'published' : 'draft',
    createdAt: now,
    publishedAt: input.publish ? now : undefined,
  };

  const surveys = await loadReviewSurveys();
  const nextSurveys = input.publish
    ? surveys.map((item) => ({ ...item, status: 'draft' as const }))
    : surveys;
  await writeList(SURVEYS_KEY, [survey, ...nextSurveys]);
  return survey;
}

export async function publishReviewSurvey(surveyId: string) {
  const now = new Date().toISOString();
  const surveys = await loadReviewSurveys();
  const nextSurveys = surveys.map((survey) => ({
    ...survey,
    status: survey.id === surveyId ? ('published' as const) : ('draft' as const),
    publishedAt: survey.id === surveyId ? now : survey.publishedAt,
  }));
  await writeList(SURVEYS_KEY, nextSurveys);
  return nextSurveys.find((survey) => survey.id === surveyId) ?? null;
}

export async function loadReviewResponses() {
  const responses = await readList<ReviewResponse>(REVIEW_RESPONSES_KEY);
  return responses.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function submitReviewResponse(input: {
  survey: ReviewSurvey;
  userId: string;
  username: string;
  answers: Record<string, string>;
  stars: number;
}) {
  const response: ReviewResponse = {
    id: makeId('review'),
    surveyId: input.survey.id,
    surveyTitle: input.survey.title,
    userId: input.userId,
    username: input.username,
    answers: input.answers,
    stars: Math.max(1, Math.min(5, Math.round(input.stars))),
    submittedAt: new Date().toISOString(),
  };

  const responses = await loadReviewResponses();
  await writeList(REVIEW_RESPONSES_KEY, [response, ...responses]);
  return response;
}

export async function loadChatMessages() {
  const messages = await readList<ChatMessage>(CHAT_MESSAGES_KEY);
  return messages.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addChatMessage(input: { userId: string; username: string; body: string }) {
  const message: ChatMessage = {
    id: makeId('chat'),
    userId: input.userId,
    username: input.username,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
    likes: 0,
    dislikes: 0,
    likedBy: [],
    dislikedBy: [],
  };

  const messages = await loadChatMessages();
  await writeList(CHAT_MESSAGES_KEY, [message, ...messages]);
  return message;
}

export async function voteChatMessage(messageId: string, userId: string, vote: 'like' | 'dislike') {
  const messages = await loadChatMessages();
  const nextMessages = messages.map((message) => {
    if (message.id !== messageId) return message;

    const liked = message.likedBy.includes(userId);
    const disliked = message.dislikedBy.includes(userId);
    const likedBy =
      vote === 'like'
        ? liked
          ? message.likedBy.filter((id) => id !== userId)
          : [...message.likedBy, userId]
        : message.likedBy.filter((id) => id !== userId);
    const dislikedBy =
      vote === 'dislike'
        ? disliked
          ? message.dislikedBy.filter((id) => id !== userId)
          : [...message.dislikedBy, userId]
        : message.dislikedBy.filter((id) => id !== userId);

    return {
      ...message,
      likedBy,
      dislikedBy,
      likes: likedBy.length,
      dislikes: dislikedBy.length,
    };
  });
  await writeList(CHAT_MESSAGES_KEY, nextMessages);
  return nextMessages;
}

export async function upsertPlatformUser(input: {
  user: any;
  role: AppRole;
  progressMap: ProgressMap;
}) {
  if (!input.user?.id) return null;

  const now = new Date().toISOString();
  const users = await readList<PlatformUser>(PLATFORM_USERS_KEY);
  const existing = users.find((item) => item.id === input.user.id);
  const nextUser: PlatformUser = {
    id: input.user.id,
    username: getDisplayName(input.user),
    email: input.user.email ?? '',
    fullName: input.user.user_metadata?.full_name ?? '',
    role: input.role,
    isGuest: Boolean(input.user.is_anonymous || input.user.user_metadata?.isGuest),
    createdAt: existing?.createdAt ?? input.user.created_at ?? now,
    lastSeenAt: now,
    coursesTaken: getCoursesTaken(input.progressMap),
  };

  await writeList(PLATFORM_USERS_KEY, [nextUser, ...users.filter((item) => item.id !== nextUser.id)]);
  return nextUser;
}

export async function loadPlatformUsers() {
  const users = await readList<PlatformUser>(PLATFORM_USERS_KEY);
  return users.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

// Community Posts (Reddit-style)
const COMMUNITY_POSTS_KEY = 'capstone.communityPosts.v1';
const COMMUNITY_REPLIES_KEY = 'capstone.communityReplies.v1';

export type CommunityPost = {
  id: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  upvotedBy: string[];
  downvotedBy: string[];
  replyCount: number;
};

export type CommunityReply = {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  upvotedBy: string[];
  downvotedBy: string[];
};

export async function loadCommunityPosts() {
  const posts = await readList<CommunityPost>(COMMUNITY_POSTS_KEY);
  return posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createCommunityPost(input: {
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  content: string;
}): Promise<CommunityPost> {
  const now = new Date().toISOString();
  const post: CommunityPost = {
    id: makeId('post'),
    authorId: input.authorId,
    authorUsername: input.authorUsername,
    authorAvatarUrl: input.authorAvatarUrl,
    content: input.content.trim(),
    createdAt: now,
    updatedAt: now,
    upvotes: 0,
    downvotes: 0,
    upvotedBy: [],
    downvotedBy: [],
    replyCount: 0,
  };

  const posts = await loadCommunityPosts();
  await writeList(COMMUNITY_POSTS_KEY, [post, ...posts]);
  return post;
}

export async function voteOnPost(
  postId: string,
  userId: string,
  voteType: 'upvote' | 'downvote'
): Promise<CommunityPost | null> {
  const posts = await loadCommunityPosts();
  const postIndex = posts.findIndex((p) => p.id === postId);
  if (postIndex === -1) return null;

  const post = posts[postIndex];
  const hasUpvoted = post.upvotedBy.includes(userId);
  const hasDownvoted = post.downvotedBy.includes(userId);

  let upvotedBy = post.upvotedBy;
  let downvotedBy = post.downvotedBy;

  if (voteType === 'upvote') {
    if (hasUpvoted) {
      upvotedBy = upvotedBy.filter((id) => id !== userId);
    } else {
      upvotedBy = [...upvotedBy, userId];
      downvotedBy = downvotedBy.filter((id) => id !== userId);
    }
  } else {
    if (hasDownvoted) {
      downvotedBy = downvotedBy.filter((id) => id !== userId);
    } else {
      downvotedBy = [...downvotedBy, userId];
      upvotedBy = upvotedBy.filter((id) => id !== userId);
    }
  }

  const updatedPost: CommunityPost = {
    ...post,
    upvotes: upvotedBy.length,
    downvotes: downvotedBy.length,
    upvotedBy,
    downvotedBy,
    updatedAt: new Date().toISOString(),
  };

  posts[postIndex] = updatedPost;
  await writeList(COMMUNITY_POSTS_KEY, posts);
  return updatedPost;
}

export async function loadCommunityReplies(postId: string) {
  const replies = await readList<CommunityReply>(COMMUNITY_REPLIES_KEY);
  return replies
    .filter((r) => r.postId === postId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createCommunityReply(input: {
  postId: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  content: string;
}): Promise<CommunityReply> {
  const now = new Date().toISOString();
  const reply: CommunityReply = {
    id: makeId('reply'),
    postId: input.postId,
    authorId: input.authorId,
    authorUsername: input.authorUsername,
    authorAvatarUrl: input.authorAvatarUrl,
    content: input.content.trim(),
    createdAt: now,
    updatedAt: now,
    upvotes: 0,
    downvotes: 0,
    upvotedBy: [],
    downvotedBy: [],
  };

  const replies = await readList<CommunityReply>(COMMUNITY_REPLIES_KEY);
  await writeList(COMMUNITY_REPLIES_KEY, [reply, ...replies]);

  // Update reply count on post
  const posts = await loadCommunityPosts();
  const postIndex = posts.findIndex((p) => p.id === input.postId);
  if (postIndex !== -1) {
    posts[postIndex] = { ...posts[postIndex], replyCount: posts[postIndex].replyCount + 1 };
    await writeList(COMMUNITY_POSTS_KEY, posts);
  }

  return reply;
}

export async function voteOnReply(
  replyId: string,
  userId: string,
  voteType: 'upvote' | 'downvote'
): Promise<CommunityReply | null> {
  const replies = await readList<CommunityReply>(COMMUNITY_REPLIES_KEY);
  const replyIndex = replies.findIndex((r) => r.id === replyId);
  if (replyIndex === -1) return null;

  const reply = replies[replyIndex];
  const hasUpvoted = reply.upvotedBy.includes(userId);
  const hasDownvoted = reply.downvotedBy.includes(userId);

  let upvotedBy = reply.upvotedBy;
  let downvotedBy = reply.downvotedBy;

  if (voteType === 'upvote') {
    if (hasUpvoted) {
      upvotedBy = upvotedBy.filter((id) => id !== userId);
    } else {
      upvotedBy = [...upvotedBy, userId];
      downvotedBy = downvotedBy.filter((id) => id !== userId);
    }
  } else {
    if (hasDownvoted) {
      downvotedBy = downvotedBy.filter((id) => id !== userId);
    } else {
      downvotedBy = [...downvotedBy, userId];
      upvotedBy = upvotedBy.filter((id) => id !== userId);
    }
  }

  const updatedReply: CommunityReply = {
    ...reply,
    upvotes: upvotedBy.length,
    downvotes: downvotedBy.length,
    upvotedBy,
    downvotedBy,
    updatedAt: new Date().toISOString(),
  };

  replies[replyIndex] = updatedReply;
  await writeList(COMMUNITY_REPLIES_KEY, replies);
  return updatedReply;
}
