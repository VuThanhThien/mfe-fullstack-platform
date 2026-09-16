import { Avatar, Box, Card, CardContent, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export type MeetingItem = {
  id: string;
  person: string;
  date: string;
  /** Optional same-origin or imported URL; defaults to initials */
  imgSrc?: string;
  action?: ReactNode;
};

export type MeetingsWidgetProps = {
  title: string;
  meetings: MeetingItem[];
  footer?: ReactNode;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function MeetingsWidget({
  title,
  meetings,
  footer,
}: MeetingsWidgetProps) {
  return (
    <>
      <Typography component="h2" marginBottom={3} variant="h4">
        {title}
      </Typography>
      {meetings.map((meeting) => (
        <Card key={meeting.id} sx={{ mb: 2 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              alt={`${meeting.person} avatar`}
              src={meeting.imgSrc}
              sx={{ mr: 2 }}
            >
              {initials(meeting.person)}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography component="div" variant="h6">
                {meeting.person}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                component="div"
              >
                {meeting.date}
              </Typography>
            </Box>
            {meeting.action}
          </CardContent>
        </Card>
      ))}
      {footer}
    </>
  );
}
