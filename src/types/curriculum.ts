export type LessonStatus = 'draft' | 'published' | 'archived';

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface LessonContent {
  id: string;
  title: string;
  description: string;
  status: LessonStatus;
  duration: number;
  audience: string;
  tags: string[];
  lectureNotes: string[];
  quizzes: QuizQuestion[];
  createdAt?: string;
  updatedAt?: string;
}
