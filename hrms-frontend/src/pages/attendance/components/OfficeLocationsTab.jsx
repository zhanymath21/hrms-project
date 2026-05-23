// src/pages/attendance/components/OfficeLocationsTab.jsx
import React, { useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  Stack,
  CircularProgress,
  Alert,
  Button,
  Tooltip,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  RadioButtonChecked as ActiveIcon,
  RadioButtonUnchecked as InactiveIcon,
} from '@mui/icons-material';
import { useAttendance } from '../../contexts/AttendanceContext';

const OfficeLocationsTab = () => {
  const { officeLocations, loading, error, fetchOfficeLocations } = useAttendance();

  useEffect(() => {
    fetchOfficeLocations();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={3}>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add Office Location
        </Button>
      </Box>

      <Grid container spacing={3}>
        {officeLocations.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">No office locations found</Typography>
            </Paper>
          </Grid>
        ) : (
          officeLocations.map((location) => (
            <Grid item xs={12} md={6} lg={4} key={location.id}>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {location.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Code: {location.code}
                        </Typography>
                      </Box>
                      <Chip
                        icon={location.is_active ? <ActiveIcon /> : <InactiveIcon />}
                        label={location.is_active ? 'Active' : 'Inactive'}
                        color={location.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>

                    <Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Address
                      </Typography>
                      <Typography variant="body2">{location.address || '-'}</Typography>
                    </Box>

                    <Box display="flex" gap={2}>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Latitude
                        </Typography>
                        <Typography variant="body2">{location.latitude}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Longitude
                        </Typography>
                        <Typography variant="body2">{location.longitude}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Radius
                        </Typography>
                        <Typography variant="body2">{location.radius_meters}m</Typography>
                      </Box>
                    </Box>

                    <Box display="flex" gap={1} justifyContent="flex-end">
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};

export default OfficeLocationsTab;