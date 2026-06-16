import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator, Button,
} from 'apparent';

export function Default() {
  return (
    <div style={{ padding: 24, minHeight: 220 }}>
      <DropdownMenu open modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Account</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} style={{ width: 200 }}>
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Saved theses</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
