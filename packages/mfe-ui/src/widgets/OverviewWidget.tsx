import { Card, CardContent, Typography } from '@mui/material';

export type OverviewWidgetProps = {
  description: string;
  title: string;
};

export function OverviewWidget({ description, title }: OverviewWidgetProps) {
  return (
    <Card>
      <CardContent sx={{ textAlign: 'center' }}>
        <Typography gutterBottom component="div" variant="h3">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" component="p">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}
