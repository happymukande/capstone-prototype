import React from 'react';

const styles = {
  card: {
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    display: 'flex',
    flexDirection: 'column',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: 18 },
  desc: { margin: '8px 0', color: '#444' },
  meta: { display: 'flex', gap: 12, color: '#666', fontSize: 14 },
  progressWrap: { marginTop: 8 },
  progressBar: { height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' },
  progressFill: (pct) => ({ width: `${pct}%`, height: '100%', background: '#4caf50' }),
  button: { marginTop: 12, padding: '8px 12px', border: 'none', background: '#1976d2', color: '#fff', borderRadius: 4, cursor: 'pointer' },
};

export default function LessonCard({ lesson, onClick }) {
  const { title, description, duration, timeSpent, progress } = lesson;
  const ctaText = progress > 0 && progress < 100 ? 'Continue' : progress === 100 ? 'Review' : 'Start';
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        <div style={styles.meta}>
          <span>{timeSpent}/{duration} min</span>
        </div>
      </div>
      <p style={styles.desc}>{description}</p>
      <div style={styles.progressWrap}>
        <div style={styles.progressBar}>
          <div style={styles.progressFill(progress)} />
        </div>
      </div>
      <button style={styles.button} onClick={() => onClick && onClick(lesson)}>{ctaText}</button>
    </div>
  );
}
