import {
  Box,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { clampPercent } from './clamp.js';

export type TeamRow = {
  id: string;
  name: string;
  progress: number;
  value: number | string;
  color: string;
};

export type TeamProgressWidgetProps = {
  title: string;
  teams: TeamRow[];
  columns?: { team: string; progress: string; value: string };
};

export function TeamProgressWidget({
  title,
  teams,
  columns = { team: 'Team', progress: 'Progress', value: 'Value' },
}: TeamProgressWidgetProps) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardContent sx={{ px: 2 }}>
        <TableContainer>
          <Table
            aria-label="team progress table"
            size="small"
            sx={{ '& td, & th': { border: 0 } }}
          >
            <TableHead>
              <TableRow>
                <TableCell>{columns.team}</TableCell>
                <TableCell>{columns.progress}</TableCell>
                <TableCell align="center">{columns.value}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map((team) => {
                const progress = clampPercent(team.progress);
                return (
                  <TableRow key={team.id}>
                    <TableCell>
                      <Typography color="text.secondary" component="div">
                        {team.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', mr: 3 }}>
                          <LinearProgress
                            aria-label={`${team.name} progress`}
                            color="inherit"
                            sx={{ color: team.color }}
                            value={progress}
                            variant="determinate"
                          />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                          <Typography
                            component="span"
                            variant="h6"
                            color={team.color}
                          >
                            {`${progress}%`}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">{team.value}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
