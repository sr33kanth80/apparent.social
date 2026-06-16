import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuShortcut,
  Button,
} from 'apparent';

export function Open() {
  return (
    <div style={{ padding: 24, minHeight: 280 }}>
      <DropdownMenu open modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Sort &amp; filter</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} style={{ width: 220 }}>
          <DropdownMenuLabel>Dealflow</DropdownMenuLabel>
          <DropdownMenuItem>Best thesis match<DropdownMenuShortcut>⌘M</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem>Most recent</DropdownMenuItem>
          <DropdownMenuItem>Highest traction</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>Verified only</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem>Has revenue</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
