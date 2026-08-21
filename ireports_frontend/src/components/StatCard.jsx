import { Avatar, Box, Card, CardContent, Typography } from "@mui/material";

export default function StatCard({ label, value, icon, tint, subtext }) {
  return (
    <Card
      sx={{
        bgcolor: tint ?? "background.paper",
        color: tint ? "#fff" : "text.primary",
      }}
    >
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 0.5 }}>
          <Avatar
            variant="rounded"
            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", display: { xs: 'none', sm: 'flex' } }}
          >
            {icon}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ color: tint ? "rgba(255,255,255,0.8)" : "text.secondary" }}
            >
              {label}
            </Typography>
            <Typography variant="h6" noWrap sx={{ color: "#fff" }}>
              {value}
            </Typography>
          </Box>
          </Box>
          {subtext && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{subtext}</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
