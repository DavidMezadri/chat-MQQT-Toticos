import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { Drawer } from "@mui/material";

interface SideAppBarProps {
  open: boolean; // controla se a barra está aberta
  buttons: number[]; // lista de IDs para criar botões
  onSelect: (id: number) => void; // callback quando um botão é clicado
}

export default function SideAppBar({
  open,
  buttons,
  onSelect,
}: SideAppBarProps) {
  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: 220,
        "& .MuiDrawer-paper": {
          transition: "left 0.3s ease",
          width: 220,
          top: 80,
          left: open ? 0 : -220,
          backgroundColor: "var(--background-accent)",
          color: "white",
          boxSizing: "border-box",
          borderRadius: "0px 10px 0",
        },
      }}
    >
      <Box sx={{ alignItems: "center", p: 2 }}>
        <Typography variant="h6" sx={{ ml: 1, textAlign: "center" }}>
          Conversas
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", p: 2, gap: 1 }}>
        {buttons.map((id) => (
          <Button
            key={id}
            sx={{
              backgroundColor: "var(--background-color)",
              boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)",
              color: "inherit",
            }}
            onClick={() => onSelect(id)}
          >
            {id}
          </Button>
        ))}
      </Box>
    </Drawer>
  );
}
