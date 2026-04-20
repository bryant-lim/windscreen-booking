
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Flex, 
  Badge, 
  Table, 
  Tbody, 
  Tr, 
  Td, 
  Thead, 
  Th,
  Link,
  Loader
} from '@strapi/design-system';

const BookingDashboard = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, pendingClaims: 0, weekly: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const next7Days = new Date();
        next7Days.setDate(today.getDate() + 7);
        const next7DaysStr = next7Days.toISOString().split('T')[0];

        const baseUrl = '/api/bookings';

        // 1. Fetch recent bookings (last 10)
        const response = await fetch(`${baseUrl}?sort=createdAt:desc&pagination[limit]=10&populate=*`);
        const result = await response.json();
        setData(result.data || []);

        // 2. Fetch Stats via Public API
        const [todayRes, pendingRes, weeklyRes] = await Promise.all([
          fetch(`${baseUrl}?filters[AppointmentDate][$eq]=${todayStr}&pagination[limit]=1`),
          fetch(`${baseUrl}?filters[PaymentMode][$containsi]=Insurance&filters[Status][$containsi]=Pending&pagination[limit]=1`),
          fetch(`${baseUrl}?filters[AppointmentDate][$gte]=${todayStr}&filters[AppointmentDate][$lte]=${next7DaysStr}&pagination[limit]=1`)
        ]);
        
        const todayData = await todayRes.json();
        const pendingData = await pendingRes.json();
        const weeklyData = await weeklyRes.json();

        setStats({
          today: todayData.meta?.pagination?.total || 0,
          pendingClaims: pendingData.meta?.pagination?.total || 0,
          weekly: weeklyData.meta?.pagination?.total || 0
        });
      } catch (err) {
        console.error('Dash error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return (
    <Box padding={4} background="neutral100" hasRadius marginBottom={4}>
      <Flex justify="center" gap={2}>
        <Loader small>Loading snapshot...</Loader>
      </Flex>
    </Box>
  );

  const getFilterUrl = (filters: string) => {
    return `/admin/content-manager/collection-types/api::booking.booking?${filters}`;
  };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const next7Days = new Date();
  next7Days.setDate(today.getDate() + 7);
  const next7DaysStr = next7Days.toISOString().split('T')[0];

  return (
    <Box 
      padding={6} 
      background="neutral0" 
      shadow="filterShadow" 
      hasRadius 
      borderStyle="solid" 
      borderWidth="1px" 
      borderColor="neutral150" 
      marginBottom={6}
      width="100%"
      style={{ borderTop: '4px solid #f97316' }}
    >
      <Flex justifyContent="space-between" marginBottom={4}>
        <Typography variant="delta" fontWeight="bold" style={{ color: '#101828' }}>
          Operations Snapshot
        </Typography>
        <Badge>Real-time</Badge>
      </Flex>

      <Flex gap={4} alignItems="stretch">
        <Box flex="1">
          <Link href={getFilterUrl(`filters[$and][0][AppointmentDate][$eq]=${todayStr}`)} style={{ textDecoration: 'none', display: 'block' }}>
            <Box padding={4} background="neutral100" hasRadius borderStyle="solid" borderWidth="1px" borderColor="neutral200" transition="all 0.2s" hover={{ background: 'orange100', borderColor: 'orange200' }}>
              <Flex direction="column" alignItems="flex-start" gap={1}>
                <Typography variant="sigma" textColor="neutral600">TODAY'S APPT</Typography>
                <Typography variant="alpha" fontWeight="bold" style={{ color: '#f97316' }}>{stats.today}</Typography>
              </Flex>
            </Box>
          </Link>
        </Box>

        <Box flex="1">
          <Link href={getFilterUrl(`filters[$and][0][AppointmentDate][$gte]=${todayStr}&filters[$and][1][AppointmentDate][$lte]=${next7DaysStr}`)} style={{ textDecoration: 'none', display: 'block' }}>
            <Box padding={4} background="neutral100" hasRadius borderStyle="solid" borderWidth="1px" borderColor="neutral200" transition="all 0.2s" hover={{ background: 'orange100', borderColor: 'orange200' }}>
              <Flex direction="column" alignItems="flex-start" gap={1}>
                <Typography variant="sigma" textColor="neutral600">Next 7 Days</Typography>
                <Typography variant="alpha" fontWeight="bold" style={{ color: '#f97316' }}>{stats.weekly}</Typography>
              </Flex>
            </Box>
          </Link>
        </Box>

        <Box flex="1">
          <Link href={getFilterUrl(`filters[$and][0][PaymentMode][$eq]=Insurance&filters[$and][1][Status][$eq]=Pending`)} style={{ textDecoration: 'none', display: 'block' }}>
            <Box padding={4} background={stats.pendingClaims > 0 ? "orange100" : "neutral100"} hasRadius borderStyle="solid" borderWidth="1px" borderColor={stats.pendingClaims > 0 ? "orange200" : "neutral200"} transition="all 0.2s" hover={{ background: 'orange200' }}>
              <Flex direction="column" alignItems="flex-start" gap={1}>
                <Typography variant="sigma" textColor={stats.pendingClaims > 0 ? "orange700" : "neutral600"}>Pending Claims</Typography>
                <Typography variant="alpha" fontWeight="bold" style={{ color: stats.pendingClaims > 0 ? '#ea580c' : '#f97316' }}>{stats.pendingClaims}</Typography>
              </Flex>
            </Box>
          </Link>
        </Box>
      </Flex>
    </Box>
  );
};

export default BookingDashboard;
