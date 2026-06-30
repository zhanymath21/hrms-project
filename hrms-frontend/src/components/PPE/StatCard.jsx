// src/components/PPE/StatCard.jsx

import { Card, CardContent, Box, Typography } from '@mui/material';

// PASTIKAN ADA export default
export default function StatCard({ icon, title, value, color }) {
  return (
    <Card sx={{ height: '100%', borderRadius: 2 }}>
      <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
        <Box sx={{ color, mb: 1 }}>{icon}</Box>
        <Typography variant="h5" fontWeight="bold">{value || 0}</Typography>
        <Typography variant="body2" color="textSecondary">{title}</Typography>
      </CardContent>
    </Card>
  );
}