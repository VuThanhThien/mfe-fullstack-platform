/** Fixture data for demo Dashboard widgets. */
export const dashboardOverview = [
  { title: '20 700', description: 'Visits' },
  { title: '$ 1 550', description: 'Sales' },
  { title: '149', description: 'Orders' },
  { title: '657', description: 'Users' },
];

export const dashboardActivity = {
  title: 'Activity',
  series: [
    { name: 'Jan', value: 2400 },
    { name: 'Feb', value: 1398 },
    { name: 'Mar', value: 9800 },
    { name: 'Apr', value: 3908 },
    { name: 'May', value: 4800 },
    { name: 'Jun', value: 3800 },
    { name: 'Jul', value: 4300 },
  ],
};

export const dashboardBudget = {
  title: 'Budget',
  series: [
    { subject: 'Marketing', value: 110 },
    { subject: 'Research', value: 98 },
    { subject: 'Sales', value: 86 },
    { subject: 'Ops', value: 99 },
    { subject: 'HR', value: 85 },
    { subject: 'Dev', value: 65 },
  ],
};

export const dashboardSalesHistory = {
  title: 'Sales history',
  value: 567,
  unitLabel: 'Sales this week',
  series: [
    { name: 'Mon', value: 4000 },
    { name: 'Tue', value: 3000 },
    { name: 'Wed', value: 2000 },
    { name: 'Thu', value: 2780 },
    { name: 'Fri', value: 1890 },
    { name: 'Sat', value: 2390 },
  ],
};

export const dashboardProgress = [
  { title: 'Visit progress', value: 75 },
  { title: 'Order progress', value: 50 },
  { title: 'Sales progress', value: 25 },
];

export const dashboardCircle = { title: 'Progress', value: 75 };

export const dashboardUsers = {
  title: 'Users',
  users: [
    { id: '1', name: 'Arriaga Rhys', role: 'Admin' },
    { id: '2', name: 'Core Laura', role: 'Member' },
    { id: '3', name: 'Jagger Joshua', role: 'Member' },
  ],
};

export const dashboardTeams = {
  title: 'Teams',
  teams: [
    { id: '1', name: 'Marketing Team', progress: 75, value: 122, color: 'primary.main' },
    { id: '2', name: 'Operations Team', progress: 50, value: 82, color: 'warning.main' },
    { id: '3', name: 'Sales Team', progress: 25, value: 39, color: 'error.main' },
    { id: '4', name: 'Research Team', progress: 10, value: 9, color: 'text.secondary' },
  ],
};

export const dashboardByCategory = {
  title: 'Sales by category',
  series: [
    { name: 'Books', value: 400 },
    { name: 'Movies', value: 300 },
    { name: 'Software', value: 300 },
  ],
};

export const dashboardByAge = {
  title: 'Sales by age',
  series: [
    { name: '18-39', value: 30 },
    { name: '40-59', value: 45 },
    { name: '60-79', value: 60 },
    { name: '80+', value: 75 },
  ],
};
