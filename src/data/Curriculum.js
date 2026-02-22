const Curriculum = [
  {
    id: 'lesson-1',
    title: 'Intro to React',
    description: 'Learn the basics of React components and JSX.',
    duration: 30,
    timeSpent: 0,
    progress: 0,
    content: [
      'What is React and why use it?',
      'JSX syntax and rendering elements',
      'Creating function components',
    ],
    lectureNotes: [
      'React is a JavaScript library for building user interfaces. It uses components to break UI into reusable pieces.',
      'JSX is a syntax extension that looks like HTML but is transformed to `React.createElement` calls.',
      'Function components are simple JS functions that return JSX and can use hooks like `useState`.',
    ],
    quizzes: [
      {
        question: 'What does JSX stand for?',
        options: ['JavaScript XML', 'JavaScript eXtension', 'JSON Styled X'],
        answer: 0,
        explanation: 'JSX stands for JavaScript XML. It is a syntax extension to JavaScript that looks like HTML but gets compiled to React.createElement calls.',
      },
      {
        question: 'Which hook is used to manage state?',
        options: ['useEffect', 'useState', 'useContext'],
        answer: 1,
        explanation: 'useState is the React hook used to manage state in function components. It returns a state variable and a setter function.',
      },
    ],
  },
  {
    id: 'lesson-2',
    title: 'State & Props',
    description: 'Manage state and pass props between components.',
    duration: 45,
    timeSpent: 20,
    progress: 44,
    content: [
      'Passing props from parent to child',
      'Lifting state up',
      'Controlled vs uncontrolled components',
    ],
    lectureNotes: [
      'Props are inputs to components and should be treated as read-only within the child.',
      'Lifting state up means moving state to the closest common ancestor to share it between components.',
      'Controlled components are driven by component state, uncontrolled components rely on the DOM.',
    ],
    quizzes: [
      {
        question: 'Props are:',
        options: ['Mutable', 'Read-only', 'Stored in localStorage'],
        answer: 1,
        explanation: 'Props are read-only. They are passed from parent to child and should not be modified by the child component. Modifying props directly will not trigger re-renders.',
      },
    ],
  },
  {
    id: 'lesson-3',
    title: 'Hooks',
    description: 'Understand useState, useEffect, and custom hooks.',
    duration: 60,
    timeSpent: 60,
    progress: 100,
    content: [
      'useState and state updates',
      'useEffect for side effects',
      'Writing a custom hook',
    ],
    lectureNotes: [
      'useState provides stateful values in function components and returns a setter to update it.',
      'useEffect runs side effects after render; dependencies control when it re-runs.',
      'Custom hooks let you extract reusable logic that uses hooks into a function starting with "use".',
    ],
    quizzes: [
      {
        question: 'Which hook runs after render?',
        options: ['useMemo', 'useEffect', 'useCallback'],
        explanation: 'useEffect runs after the component renders. It is commonly used for side effects like fetching data, subscribing to events, or updating the DOM.',
        answer: 1,
      },
    ],
  },
];

export default Curriculum;
