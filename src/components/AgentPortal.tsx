import React from 'react';
import { DashboardLayout } from './DashboardLayout';
import { Box, Typography, Paper } from '@mui/material';

export function AgentPortal() {
  return (
    <DashboardLayout>
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Agent / Property Manager Portal
        </Typography>
        <Typography color="text.secondary" mb={4}>
          Welcome to your property management dashboard. Here you can view and manage the properties you have been assigned to.
        </Typography>
        
        <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', mb: 3 }}>
           <Typography variant="h6" fontWeight="bold">Managed Properties</Typography>
           <Typography color="text.secondary">No properties have been assigned to you yet. An Owner must invite you to their property team to begin management.</Typography>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}
