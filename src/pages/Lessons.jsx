import React, { useState } from 'react';
import Curriculum from '../data/Curriculum';
import LessonCard from '../components/LessonCard';
import Lesson from './Lesson';
import { useProgress } from '../context/ProgressContext';

export default function Lessons() {
  const [selected, setSelected] = useState(null);
  const { progressMap, markLessonComplete } = useProgress();

  if (selected) {
    return <Lesson lesson={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
      <h1>Lessons</h1>
      <button type="button" onClick={() => markLessonComplete('lesson-1')}>
        Mark lesson-1 complete
      </button>
      <pre>{JSON.stringify(progressMap, null, 2)}</pre>
      {Curriculum.map((lesson) => (
        <LessonCard key={lesson.id} lesson={lesson} onClick={setSelected} />
      ))}
    </div>
  );
}
