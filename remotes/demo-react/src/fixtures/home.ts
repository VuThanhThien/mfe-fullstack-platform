/** Fixture data for demo Home widgets — English props only. */
export const homeWelcome = {
  title: 'Welcome back',
  subtitle: 'Your demo dashboard',
  message:
    'This remote showcases shared @mfe/ui widgets with fixture data. Theme follows the shell toggle.',
};

export const homeAchievement = {
  title: 'Keep going!',
  description: 'You have completed 75% of your weekly goals.',
};

export const homeFollowers = [
  { key: 'likes', label: 'Likes', value: '26,789', bgcolor: 'primary.main' },
  { key: 'love', label: 'Love', value: '6,754', bgcolor: 'error.main' },
  { key: 'smiles', label: 'Smiles', value: '52,789', bgcolor: 'warning.main' },
] as const;

export const homeViews = {
  unitLabel: 'Views',
  total: '6.967.431',
  series: [
    { name: 'Jan', value: 2.5 },
    { name: 'Feb', value: 1.4 },
    { name: 'Mar', value: 6 },
    { name: 'Apr', value: 4 },
  ],
  actionLabel: 'Go to analytics',
};

export const homeTargets = {
  title: 'Personal targets',
  targets: [
    { key: 'views', label: 'Views', value: 75 },
    { key: 'followers', label: 'Followers', value: 50 },
    { key: 'income', label: 'Income', value: 25 },
  ],
};

export const homeMeetings = {
  title: 'Meetings',
  meetings: [
    { id: '1', person: 'Emmy Anderson', date: '8:00 - 10:00' },
    { id: '2', person: 'Joy McGlynn', date: '11:00 - 12:00' },
    { id: '3', person: 'Mara Dach', date: '14:00 - 15:00' },
  ],
};
