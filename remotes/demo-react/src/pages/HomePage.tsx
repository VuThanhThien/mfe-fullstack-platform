import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Grid2 from '@mui/material/Grid2';
import { Box, IconButton } from '@mui/material';
import { Link } from 'react-router-dom';
import {
  AchievementWidget,
  FollowersWidget,
  MeetingsWidget,
  PersonalTargetsWidget,
  ViewsWidget,
  WelcomeWidget,
} from '@mfe/ui/widgets';
import {
  homeAchievement,
  homeFollowers,
  homeMeetings,
  homeTargets,
  homeViews,
  homeWelcome,
} from '../fixtures/home';

const followerIcons = {
  likes: {
    icon: <ThumbUpIcon sx={{ color: '#fff' }} />,
    trend: <ArrowDropUpIcon sx={{ color: 'success.main' }} />,
  },
  love: {
    icon: <FavoriteIcon sx={{ color: '#fff' }} />,
    trend: <ArrowRightIcon sx={{ color: 'action.disabled' }} />,
  },
  smiles: {
    icon: <EmojiEmotionsIcon sx={{ color: '#fff' }} />,
    trend: <ArrowDropDownIcon sx={{ color: 'error.main' }} />,
  },
} as const;

export function HomePage() {
  return (
    <Box data-testid="demo-home">
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, md: 6, lg: 4 }}>
          <WelcomeWidget {...homeWelcome} />
          <AchievementWidget {...homeAchievement} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6, lg: 4 }}>
          <FollowersWidget
            items={homeFollowers.map((f) => ({
              ...f,
              ...followerIcons[f.key],
            }))}
          />
          <ViewsWidget
            {...homeViews}
            action={
              <IconButton
                aria-label="Go to dashboard"
                component={Link}
                to="/dashboard"
              >
                <ChevronRightIcon />
              </IconButton>
            }
          />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6, lg: 4 }}>
          <PersonalTargetsWidget {...homeTargets} />
          <MeetingsWidget {...homeMeetings} />
        </Grid2>
      </Grid2>
    </Box>
  );
}
