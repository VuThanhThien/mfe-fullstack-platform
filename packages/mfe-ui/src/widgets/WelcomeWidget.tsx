import { Box, Card, CardContent, Typography } from '@mui/material';

export type WelcomeWidgetProps = {
  title: string;
  subtitle: string;
  message: string;
  /** Resolved image URL (Vite import or absolute path) — never a bare `assets/…` string */
  imgSrc?: string;
  imgAlt?: string;
};

export function WelcomeWidget({
  title,
  subtitle,
  message,
  imgSrc,
  imgAlt = 'Welcome',
}: WelcomeWidgetProps) {
  return (
    <Card elevation={0} sx={{ backgroundColor: 'transparent', mb: 2 }}>
      <CardContent>
        <Typography component="div" gutterBottom variant="h4">
          {title}
        </Typography>
        <Typography
          component="div"
          sx={{ fontWeight: 300, mb: 2 }}
          variant="h5"
        >
          {subtitle}
        </Typography>
        <Typography
          color="text.secondary"
          component="p"
          gutterBottom
          variant="subtitle1"
        >
          {message}
        </Typography>
        {imgSrc ? (
          <Box sx={{ mt: 2, maxWidth: 360 }}>
            <Box
              component="img"
              src={imgSrc}
              alt={imgAlt}
              sx={{ width: '100%', height: 'auto' }}
            />
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}
