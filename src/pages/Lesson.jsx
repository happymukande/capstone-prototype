import React from 'react';

export default function Lesson({ lesson, onBack }) {
  if (!lesson) return null;
  const { title, description, duration, timeSpent, progress } = lesson;
  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
      <button onClick={onBack} style={{ marginBottom: 12 }}>← Back</button>
      <h1>{title}</h1>
      <p>{description}</p>
      <p><strong>Time:</strong> {timeSpent}/{duration} min</p>
      <p><strong>Progress:</strong> {progress}%</p>
    </div>
  );
}
