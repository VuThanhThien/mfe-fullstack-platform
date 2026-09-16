import PersonIcon from '@mui/icons-material/Person';
import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  useTheme,
} from '@mui/material';
import type { ReactNode } from 'react';

export type UserRow = {
  id: string;
  name: string;
  role: string;
  action?: ReactNode;
};

export type UsersWidgetProps = {
  title: string;
  users: UserRow[];
};

export function UsersWidget({ title, users }: UsersWidgetProps) {
  const theme = useTheme();

  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        <List>
          {users.map((user) => (
            <ListItem disableGutters key={user.id}>
              <ListItemAvatar>
                <Avatar>
                  <PersonIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={user.name}
                primaryTypographyProps={{
                  fontWeight: theme.typography.fontWeightMedium,
                }}
                secondary={user.role}
              />
              {user.action ? (
                <ListItemSecondaryAction>{user.action}</ListItemSecondaryAction>
              ) : null}
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
