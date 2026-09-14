import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import Grid2 from '@mui/material/Grid2';
import { Box } from '@mui/material';
import {
  ActivityWidget,
  BudgetWidget,
  CircleProgressWidget,
  OverviewWidget,
  ProgressWidget,
  SalesByAgeWidget,
  SalesByCategoryWidget,
  SalesHistoryWidget,
  TeamProgressWidget,
  UsersWidget,
} from '@mfe/ui/widgets';
import {
  dashboardActivity,
  dashboardBudget,
  dashboardByAge,
  dashboardByCategory,
  dashboardCircle,
  dashboardOverview,
  dashboardProgress,
  dashboardSalesHistory,
  dashboardTeams,
  dashboardUsers,
} from '../fixtures/dashboard';

const progressAvatars = [
  <SupervisorAccountIcon key="v" />,
  <ShoppingBasketIcon key="o" />,
  <AttachMoneyIcon key="s" />,
];

export function DashboardPage() {
  return (
    <Box data-testid="demo-dashboard">
      <Grid2 container spacing={2}>
        {dashboardOverview.map((item) => (
          <Grid2 key={item.description} size={{ xs: 6, md: 3 }}>
            <OverviewWidget title={item.title} description={item.description} />
          </Grid2>
        ))}
        <Grid2 size={{ xs: 12, md: 8 }}>
          <ActivityWidget {...dashboardActivity} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <BudgetWidget {...dashboardBudget} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <SalesHistoryWidget {...dashboardSalesHistory} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          {dashboardProgress.map((p, i) => (
            <ProgressWidget
              key={p.title}
              title={p.title}
              value={p.value}
              avatar={progressAvatars[i]}
              mb={i < dashboardProgress.length - 1 ? 2 : 0}
            />
          ))}
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <CircleProgressWidget height={204} {...dashboardCircle} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <UsersWidget {...dashboardUsers} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <TeamProgressWidget {...dashboardTeams} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <SalesByCategoryWidget {...dashboardByCategory} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <SalesByAgeWidget {...dashboardByAge} />
        </Grid2>
      </Grid2>
    </Box>
  );
}
