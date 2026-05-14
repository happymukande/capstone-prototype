import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthProvider';
import { AppThemeColors } from '../../src/constants/theme';
import { useProgress } from '../../src/context/ProgressContext';
import { useRole } from '../../src/context/RoleContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import {
  CommunityPost,
  CommunityReply,
  createCommunityPost,
  createCommunityReply,
  getDisplayName,
  loadCommunityPosts,
  loadCommunityReplies,
  loadPlatformUsers,
  loadPublishedSurvey,
  PlatformUser,
  ReviewSurvey,
  submitReviewResponse,
  upsertPlatformUser,
  voteOnPost,
  voteOnReply
} from '../../src/services/communityData';
import { fetchCurrentUserProfile, isUserOnline } from '../../src/services/userProfiles';
import UserProfileModal from '../components/UserProfileModal';

type CommunityTab = 'discuss' | 'survey';

export default function CommunityScreen() {
  const { user } = useAuth();
  const { role } = useRole();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { progressMap, gamification } = useProgress();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [activeTab, setActiveTab] = useState<CommunityTab>('discuss');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPostingBusy, setIsPostingBusy] = useState(false);
  
  // Survey state
  const [survey, setSurvey] = useState<ReviewSurvey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stars, setStars] = useState(0);
  const [reviewMessage, setReviewMessage] = useState('');
  
  // Reply state
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [isReplyingBusy, setIsReplyingBusy] = useState(false);
  
  // Profile modal state
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);

  const userId = user?.id ?? '';
  const username = getDisplayName(user);

  const loadCommunityData = useCallback(async () => {
    try {
      const nextPosts = await loadCommunityPosts();
      setPosts(nextPosts);

      const nextUsers = await loadPlatformUsers();
      setPlatformUsers(nextUsers);

      const nextSurvey = await loadPublishedSurvey();
      setSurvey(nextSurvey);
    } catch (err) {
      // Surface load errors to console for debugging
       
      console.error('Failed to load community data', err);
      Alert.alert('Error', 'Failed to load community data');
    }
  }, []);

  useEffect(() => {
    void loadCommunityData();
  }, [loadCommunityData]);

  useEffect(() => {
    if (!user) return;
    void upsertPlatformUser({ user, role, progressMap });
  }, [progressMap, role, user]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !userId) return;
    
    setIsPostingBusy(true);
    try {
      const userProfile = await fetchCurrentUserProfile(userId);
      const newPost = await createCommunityPost({
        authorId: userId,
        authorUsername: username,
        authorAvatarUrl: userProfile?.avatarUrl ?? null,
        content: newPostContent,
      });
      setPosts([newPost, ...posts]);
      setNewPostContent('');
     
    } catch (error: unknown) {
       
      console.error('Failed to create post', error);
      const msg = error instanceof Error ? error.message : 'Failed to create post';
      Alert.alert('Error', msg);
    } finally {
      setIsPostingBusy(false);
    }
  };

  const handlePostVote = async (postId: string, voteType: 'upvote' | 'downvote') => {
    const updated = await voteOnPost(postId, userId, voteType);
    if (updated) {
      setPosts(posts.map((p) => (p.id === postId ? updated : p)));
    }
  };

  const handleSelectPost = async (post: CommunityPost) => {
    setSelectedPost(post);
    const postReplies = await loadCommunityReplies(post.id);
    setReplies(postReplies);
  };

  const handleCreateReply = async () => {
    if (!replyContent.trim() || !userId || !selectedPost) return;
    
    setIsReplyingBusy(true);
    try {
      const userProfile = await fetchCurrentUserProfile(userId);
      const newReply = await createCommunityReply({
        postId: selectedPost.id,
        authorId: userId,
        authorUsername: username,
        authorAvatarUrl: userProfile?.avatarUrl ?? null,
        content: replyContent,
      });
      setReplies([...replies, newReply]);
      setReplyContent('');
      
      // Update post reply count
      const updatedPost = { ...selectedPost, replyCount: selectedPost.replyCount + 1 };
      setSelectedPost(updatedPost);
      setPosts(posts.map((p) => (p.id === selectedPost.id ? updatedPost : p)));
     
    } catch (error: unknown) {
       
      console.error('Failed to create reply', error);
      const msg = error instanceof Error ? error.message : 'Failed to create reply';
      Alert.alert('Error', msg);
    } finally {
      setIsReplyingBusy(false);
    }
  };

  const handleReplyVote = async (replyId: string, voteType: 'upvote' | 'downvote') => {
    const updated = await voteOnReply(replyId, userId, voteType);
    if (updated) {
      setReplies(replies.map((r) => (r.id === replyId ? updated : r)));
    }
  };

  const handleShowUserProfile = async (post: CommunityPost | CommunityReply) => {
    const user = platformUsers.find((u) => u.id === post.authorId);
    if (!user) return;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const userProfile = await fetchCurrentUserProfile(post.authorId);
    setSelectedUserProfile({
      userId: post.authorId,
      username: post.authorUsername,
      avatarUrl: post.authorAvatarUrl,
      xp: user.coursesTaken.length * 100, // Simplified calculation
      level: Math.floor(user.coursesTaken.length / 3) + 1,
      streak: 5, // TODO: Fetch from progress data
      isOnline: isUserOnline(user.id),
    });
  };

  const handleSubmitReview = async () => {
    if (!survey || stars === 0) return;
    await submitReviewResponse({ survey, userId, username, answers, stars });
    setAnswers({});
    setStars(0);
    setReviewMessage('Thanks for reviewing the app!');
  };

  // Show reply view if post selected
  if (selectedPost) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* Post being replied to */}
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>Thread</Text>
            <Text style={styles.title}>Discussion</Text>
          </View>

          <PostCard
            post={selectedPost}
            colors={colors}
            styles={styles}
            userId={userId}
            onVote={handlePostVote}
            onAvatarPress={() => handleShowUserProfile(selectedPost)}
          />

          {/* Replies */}
          <View style={styles.repliesSection}>
            <Text style={styles.repliesTitle}>Replies ({selectedPost.replyCount})</Text>
            {replies.map((reply) => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                colors={colors}
                styles={styles}
                userId={userId}
                onVote={handleReplyVote}
                onAvatarPress={() => handleShowUserProfile(reply)}
              />
            ))}
          </View>

          {/* Reply input */}
          <View style={styles.replyInputSection}>
            <TextInput
              value={replyContent}
              onChangeText={setReplyContent}
              multiline
              placeholder="Write a reply..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.replyInput]}
            />
            <Pressable
              style={[styles.primaryButton, isReplyingBusy && styles.disabledButton]}
              disabled={isReplyingBusy || !replyContent.trim()}
              onPress={() => void handleCreateReply()}
            >
              <Text style={styles.primaryButtonText}>
                {isReplyingBusy ? 'Posting...' : 'Reply'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton]}
              onPress={() => {
                setSelectedPost(null);
                setReplies([]);
                setReplyContent('');
              }}
            >
              <Text style={styles.secondaryButtonText}>Back to Posts</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Connect</Text>
          <Text style={styles.title}>Community</Text>
          <Text style={styles.subtitle}>Share opinions, ask questions, and discuss with learners.</Text>
        </View>

        <View style={styles.tabRow}>
          {(['discuss', 'survey'] as CommunityTab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                {tab === 'discuss' ? 'Discussions' : 'Review App'}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'discuss' ? (
          <>
            {/* New Post Input */}
            <View style={styles.newPostCard}>
              <TextInput
                value={newPostContent}
                onChangeText={setNewPostContent}
                multiline
                style={[styles.input, styles.postInput]}
                placeholder="Start a discussion..."
                placeholderTextColor={colors.textMuted}
              />
              <Pressable
                style={[styles.primaryButton, isPostingBusy && styles.disabledButton]}
                disabled={isPostingBusy || !newPostContent.trim()}
                onPress={() => void handleCreatePost()}
              >
                <Text style={styles.primaryButtonText}>
                  {isPostingBusy ? 'Posting...' : 'Post'}
                </Text>
              </Pressable>
            </View>

            {/* Posts List */}
            {posts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No discussions yet. Start one!</Text>
              </View>
            ) : (
              posts.map((post) => (
                <Pressable
                  key={post.id}
                  style={styles.postContainer}
                  onPress={() => void handleSelectPost(post)}
                >
                  <PostCard
                    post={post}
                    colors={colors}
                    styles={styles}
                    userId={userId}
                    onVote={handlePostVote}
                    onAvatarPress={() => handleShowUserProfile(post)}
                  />
                </Pressable>
              ))
            )}
          </>
        ) : (
          /* Survey Tab */
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{survey ? survey.title : 'Review App'}</Text>
            <Text style={styles.cardDetail}>
              {survey
                ? survey.description || 'Share quick feedback with your teacher/admin.'
                : 'No review survey has been published yet.'}
            </Text>

            {survey?.questions.map((question) => (
              <View key={question.id} style={styles.formGroup}>
                <Text style={styles.label}>{question.prompt}</Text>
                <TextInput
                  value={answers[question.id] ?? ''}
                  onChangeText={(value) =>
                    setAnswers((prev) => ({ ...prev, [question.id]: value }))
                  }
                  multiline
                  style={[styles.input, styles.multiline]}
                  placeholder="Type your answer"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ))}

            {survey && (
              <>
                <Text style={styles.label}>
                  In summary, how many stars would you rate this app so far?
                </Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Pressable key={value} onPress={() => setStars(value)} hitSlop={8}>
                      <Ionicons
                        name={value <= stars ? 'star' : 'star-outline'}
                        size={34}
                        color={value <= stars ? colors.primaryStrong : colors.textMuted}
                      />
                    </Pressable>
                  ))}
                </View>
                {reviewMessage ? <Text style={styles.successText}>{reviewMessage}</Text> : null}
                <Pressable
                  style={[styles.primaryButton, stars === 0 && styles.disabledButton]}
                  disabled={stars === 0}
                  onPress={() => void handleSubmitReview()}
                >
                  <Text style={styles.primaryButtonText}>Submit Review</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <UserProfileModal
        visible={!!selectedUserProfile}
        user={selectedUserProfile}
        colors={colors}
        onClose={() => setSelectedUserProfile(null)}
      />
    </KeyboardAvoidingView>
  );
}

interface PostCardProps {
  post: CommunityPost;
  colors: AppThemeColors;
  styles: any;
  userId: string;
  onVote: (postId: string, voteType: 'upvote' | 'downvote') => void;
  onAvatarPress: () => void;
}

function PostCard({
  post,
  colors,
  styles,
  userId,
  onVote,
  onAvatarPress,
}: PostCardProps) {
  const hasUpvoted = post.upvotedBy.includes(userId);
  const hasDownvoted = post.downvotedBy.includes(userId);
  const initials = post.authorUsername.slice(0, 2).toUpperCase();

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Pressable style={styles.authorInfo} onPress={onAvatarPress}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}>
            {post.authorAvatarUrl ? (
              <Image
                source={{ uri: post.authorAvatarUrl }}
                style={styles.avatarImage}
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
          <View style={styles.authorMeta}>
            <Text style={styles.authorName}>{post.authorUsername}</Text>
            <Text style={styles.postTime}>
              {new Date(post.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </Pressable>
      </View>

      <Text style={styles.postContent}>{post.content}</Text>

      <View style={styles.postFooter}>
        <View style={styles.voteSection}>
          <Pressable
            style={[styles.voteButton, hasUpvoted && styles.voteButtonActive]}
            onPress={() => onVote(post.id, 'upvote')}
          >
            <Ionicons
              name={hasUpvoted ? 'arrow-up' : 'arrow-up-outline'}
              size={18}
              color={hasUpvoted ? colors.primaryStrong : colors.textPrimary}
            />
            <Text style={[styles.voteText, hasUpvoted && styles.voteTextActive]}>
              {post.upvotes}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.voteButton, hasDownvoted && styles.voteButtonActive]}
            onPress={() => onVote(post.id, 'downvote')}
          >
            <Ionicons
              name={hasDownvoted ? 'arrow-down' : 'arrow-down-outline'}
              size={18}
              color={hasDownvoted ? colors.danger : colors.textPrimary}
            />
            <Text style={[styles.voteText, hasDownvoted && styles.voteTextActive]}>
              {post.downvotes}
            </Text>
          </Pressable>
        </View>

        <View style={styles.replyCountBadge}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.replyCountText}>{post.replyCount}</Text>
        </View>
      </View>
    </View>
  );
}

interface ReplyCardProps {
  reply: CommunityReply;
  colors: AppThemeColors;
  styles: any;
  userId: string;
  onVote: (replyId: string, voteType: 'upvote' | 'downvote') => void;
  onAvatarPress: () => void;
}

function ReplyCard({
  reply,
  colors,
  styles,
  userId,
  onVote,
  onAvatarPress,
}: ReplyCardProps) {
  const hasUpvoted = reply.upvotedBy.includes(userId);
  const hasDownvoted = reply.downvotedBy.includes(userId);
  const initials = reply.authorUsername.slice(0, 2).toUpperCase();

  return (
    <View style={styles.replyCard}>
      <Pressable style={styles.replyHeader} onPress={onAvatarPress}>
        <View style={[styles.smallAvatar, { backgroundColor: colors.surfaceAlt }]}>
          {reply.authorAvatarUrl ? (
            <Image
              source={{ uri: reply.authorAvatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
              cachePolicy="disk"
            />
          ) : (
            <Text style={styles.smallAvatarInitials}>{initials}</Text>
          )}
        </View>
        <View style={styles.replyAuthorMeta}>
          <Text style={styles.replyAuthorName}>{reply.authorUsername}</Text>
          <Text style={styles.replyTime}>{new Date(reply.createdAt).toLocaleDateString()}</Text>
        </View>
      </Pressable>

      <Text style={styles.replyContent}>{reply.content}</Text>

      <View style={styles.replyFooter}>
        <Pressable
          style={[styles.smallVoteButton, hasUpvoted && styles.voteButtonActive]}
          onPress={() => onVote(reply.id, 'upvote')}
        >
          <Ionicons
            name={hasUpvoted ? 'arrow-up' : 'arrow-up-outline'}
            size={14}
            color={hasUpvoted ? colors.primaryStrong : colors.textPrimary}
          />
          <Text style={[styles.smallVoteText, hasUpvoted && styles.voteTextActive]}>
            {reply.upvotes}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.smallVoteButton, hasDownvoted && styles.voteButtonActive]}
          onPress={() => onVote(reply.id, 'downvote')}
        >
          <Ionicons
            name={hasDownvoted ? 'arrow-down' : 'arrow-down-outline'}
            size={14}
            color={hasDownvoted ? colors.danger : colors.textPrimary}
          />
          <Text style={[styles.smallVoteText, hasDownvoted && styles.voteTextActive]}>
            {reply.downvotes}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: {
      padding: 16,
      backgroundColor: colors.screenBackground,
      flexGrow: 1,
    },
    heroCard: {
      backgroundColor: colors.heroBackground,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      marginBottom: 14,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.heroEyebrow,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.onStrong,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.heroSubtle,
      lineHeight: 22,
    },
    tabRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 12,
    },
    tabButtonActive: {
      backgroundColor: colors.primaryStrong,
      borderColor: colors.primaryStrong,
    },
    tabButtonText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    tabButtonTextActive: {
      color: colors.onStrong,
    },
    
    // New Post Input
    newPostCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    postInput: {
      minHeight: 100,
      marginBottom: 12,
    },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      color: colors.textPrimary,
      fontSize: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    multiline: {
      minHeight: 86,
      textAlignVertical: 'top',
      marginBottom: 12,
    },
    replyInput: {
      minHeight: 80,
      marginBottom: 12,
    },
    
    // Posts List
    postContainer: {
      marginBottom: 10,
    },
    postCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    postHeader: {
      marginBottom: 12,
    },
    authorInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarInitials: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.primaryStrong,
    },
    authorMeta: {
      flex: 1,
    },
    authorName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    postTime: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    postContent: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
      marginBottom: 12,
    },
    postFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    voteSection: {
      flexDirection: 'row',
      gap: 6,
    },
    voteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surfaceAlt,
    },
    voteButtonActive: {
      backgroundColor: colors.primaryStrong,
      borderColor: colors.primaryStrong,
    },
    voteText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    voteTextActive: {
      color: colors.onStrong,
    },
    replyCountBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    replyCountText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    
    // Replies
    repliesSection: {
      marginVertical: 12,
    },
    repliesTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 10,
    },
    replyCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 8,
      marginLeft: 8,
      borderLeftWidth: 3,
      borderLeftColor: colors.primaryStrong,
    },
    replyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    smallAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    smallAvatarInitials: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryStrong,
    },
    replyAuthorMeta: {
      flex: 1,
    },
    replyAuthorName: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    replyTime: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    replyContent: {
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 18,
      marginBottom: 8,
    },
    replyFooter: {
      flexDirection: 'row',
      gap: 4,
    },
    smallVoteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.surfaceAlt,
    },
    smallVoteText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    
    // Reply Input Section
    replyInputSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    
    // Buttons
    primaryButton: {
      backgroundColor: colors.primaryStrong,
      borderRadius: 12,
      alignItems: 'center',
      paddingVertical: 12,
      marginBottom: 8,
    },
    primaryButtonText: {
      color: colors.onStrong,
      fontSize: 14,
      fontWeight: '800',
    },
    secondaryButton: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      paddingVertical: 12,
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    disabledButton: {
      opacity: 0.5,
    },
    
    // Survey/Review Tab
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    cardDetail: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 12,
    },
    formGroup: {
      marginBottom: 12,
    },
    label: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 8,
    },
    starRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    successText: {
      color: colors.primaryStrong,
      fontWeight: '700',
      marginBottom: 10,
    },
    
    // Empty state
    emptyState: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: 'center',
      marginBottom: 12,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
  });
}
