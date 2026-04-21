import React from 'react';

const CARD_THEME = {
  border: '#d7e7d9',
  surface: '#ffffff',
  text: '#102318',
  secondary: '#345044',
  muted: '#5f7a6f',
  progressTrack: '#dfeade',
  progressFill: '#2f8f46',
  button: '#155724',
  buttonText: '#ffffff',
};

const styles = {
  card: {
    border: `1px solid ${CARD_THEME.border}`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    display: 'flex',
    flexDirection: 'column',
    background: CARD_THEME.surface,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: 18, color: CARD_THEME.text },
  desc: { margin: '8px 0', color: CARD_THEME.secondary, lineHeight: 1.5 },
  meta: { display: 'flex', gap: 12, color: CARD_THEME.muted, fontSize: 14 },
  progressWrap: { marginTop: 8 },
  progressBar: { height: 8, background: CARD_THEME.progressTrack, borderRadius: 999, overflow: 'hidden' },
  progressFill: (pct) => ({ width: `${pct}%`, height: '100%', background: CARD_THEME.progressFill }),
  button: {
    marginTop: 12,
    padding: '10px 14px',
    border: 'none',
    background: CARD_THEME.button,
    color: CARD_THEME.buttonText,
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
  },
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
