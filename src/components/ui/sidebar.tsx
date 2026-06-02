import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Blocks,
  ChevronsUpDown,
  FileClock,
  GraduationCap,
  Layers,
  Layout,
  LayoutDashboard,
  LogOut,
  Map,
  MessageSquareText,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Rocket,
  Search,
  Send,
  Settings,
  Target,
  UserCircle,
  UserCog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogoIcon } from '@/components/LogoIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { deriveUsername, signOut } from '@/lib/auth-service';
import type { AppUser } from '@/lib/apparent-types';

type DashboardRole = 'founder' | 'investor';

interface SessionNavBarProps {
  role: DashboardRole;
  user: AppUser;
  /** When false, advanced nav groups are tucked behind a "More" expander
      until the user has set up their workspace (progressive disclosure). */
  activated?: boolean;
}

const deriveDisplayName = (email: string): string =>
  email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const deriveInitials = (email: string): string => {
  const parts = email.split('@')[0].split(/[._-]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email[0].toUpperCase();
};

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  path?: string;
}

const SIDEBAR_PIN_STORAGE_KEY = 'apparent-sidebar-pinned';

const sidebarVariants = {
  open: {
    width: '15rem',
  },
  closed: {
    width: '3.05rem',
  },
};

const contentVariants = {
  open: { display: 'block', opacity: 1 },
  closed: { display: 'block', opacity: 1 },
};

const variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      x: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: {
      x: { stiffness: 100 },
    },
  },
};

const transitionProps = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.2,
  staggerChildren: 0.1,
} as const;

const staggerVariants = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

const roleConfig = {
  founder: {
    workspace: 'Founder Workspace',
    account: 'Founder Account',
    email: 'founder@apparent.test',
    initials: 'F',
    accent: 'text-[#02A070]',
    active: 'bg-[#dcefc7] text-black',
    basePath: '/dashboard/founder',
    groups: [
      [
        { label: 'Overview', href: '#overview', icon: LayoutDashboard },
        { label: 'Your Profile', href: '#profile', icon: UserCircle },
        { label: 'Products', href: '#products', path: '/dashboard/founder/products', icon: Rocket },
        { label: 'Investor Matches', href: '#matches', icon: Search, badge: 'AI' },
        { label: 'VC heatmap', href: '#vc-heatmap', path: '/dashboard/founder/vc-heatmap', icon: Map, badge: 'VC' },
        { label: 'Cold Outreach', href: '#outreach', icon: Send, badge: 'New' },
        { label: 'Messages', href: '#messages', icon: MessagesSquare },
      ],
      [
        { label: 'Fundraise Tracker', href: '#deals', icon: Layout },
      ],
      [
        { label: 'How to Use Apparent?', href: '#knowledge', icon: GraduationCap },
        { label: 'Feedback', href: '#feedback', icon: MessageSquareText },
      ],
    ] as NavItem[][],
  },
  investor: {
    workspace: 'Investor Workspace',
    account: 'Investor Account',
    email: 'partner@apparent.test',
    initials: 'VC',
    accent: 'text-green-700',
    active: 'bg-green-50 text-green-700',
    basePath: '/dashboard/investor',
    groups: [
      [
        { label: 'Overview', href: '#overview', icon: LayoutDashboard },
        { label: 'Your Thesis', href: '#profile', icon: Target },
        { label: 'Discover', href: '#discover', icon: Layers, badge: 'New' },
        { label: 'Builder Discovery', href: '#matches', icon: Search, badge: 'AI' },
        { label: 'Messages', href: '#messages', icon: MessagesSquare },
      ],
      [
        { label: 'Deal Flow', href: '#deals', icon: Layout },
        { label: 'Terms Review', href: '#terms', icon: FileClock },
      ],
      [
        { label: 'How to Use Apparent?', href: '#knowledge', icon: GraduationCap },
        { label: 'Feedback', href: '#feedback', icon: MessageSquareText },
      ],
    ] as NavItem[][],
  },
};

const NavLinkItem = ({
  item,
  isCollapsed,
  isActive,
  activeClass,
  basePath,
}: {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
  activeClass: string;
  basePath: string;
}) => {
  const Icon = item.icon;
  const to = item.path ?? `${basePath}${item.href}`;

  return (
    <Link
      to={to}
      className={cn(
        'flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary',
        isActive && activeClass,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <motion.li variants={variants}>
        {!isCollapsed && (
          <div className="ml-2 flex items-center gap-2">
            <p className="text-sm font-medium">{item.label}</p>
            {item.badge && (
              <Badge
                className="flex h-fit w-fit items-center rounded border-none bg-black px-1.5 text-[10px] text-white"
                variant="outline"
              >
                {item.badge}
              </Badge>
            )}
          </div>
        )}
      </motion.li>
    </Link>
  );
};

export function SessionNavBar({ role, user, activated = true }: SessionNavBarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [navExpanded, setNavExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.localStorage.getItem(SIDEBAR_PIN_STORAGE_KEY) !== 'false';
  });
  const location = useLocation();
  const navigate = useNavigate();
  const config = roleConfig[role];
  const activePath = location.pathname;
  const activeHash = location.hash || (activePath === config.basePath ? '#overview' : '');
  const isCollapsed = !isPinned && !isHovered;
  // Progressive disclosure: keep advanced groups hidden for brand-new users
  // until they activate — but never hide the group containing the active view.
  const advancedItems = config.groups.slice(1).flat();
  const activeInAdvanced = advancedItems.some((item) => item.href === activeHash || (item.path && item.path === activePath));
  const showAdvanced = activated || navExpanded || activeInAdvanced;
  const displayName = deriveDisplayName(user.email);
  const initials = deriveInitials(user.email);
  const username = user.username ?? deriveUsername(user.email);
  const publicProfileUrl = `/@${username}`;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_PIN_STORAGE_KEY, String(isPinned));
    window.dispatchEvent(new CustomEvent('apparent-sidebar-pin-change', { detail: { isPinned } }));
  }, [isPinned]);

  return (
    <motion.div
      className="sidebar fixed left-0 top-0 z-40 h-screen shrink-0 border-r border-black/10"
      initial={isCollapsed ? 'closed' : 'open'}
      animate={isCollapsed ? 'closed' : 'open'}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="relative z-40 flex h-full shrink-0 flex-col bg-white text-muted-foreground transition-all"
        variants={contentVariants}
      >
        <motion.ul variants={staggerVariants} className="flex h-full flex-col">
          <div className="flex grow flex-col items-center">
            <div className="flex w-full shrink-0 flex-col border-b">
              <Link
                to={`${config.basePath}#overview`}
                className={cn(
                  'flex h-[50px] w-full items-center gap-2 px-2 transition hover:bg-muted',
                  isCollapsed ? 'justify-center' : 'justify-start',
                )}
              >
                <LogoIcon className="h-6 w-6 shrink-0 text-black" />
                <motion.li variants={variants} className="min-w-0">
                  {!isCollapsed && (
                    <img
                      src="/apparent-wordmark.png"
                      alt="Apparent"
                      className="h-7 w-auto max-w-[8.75rem] object-contain"
                    />
                  )}
                </motion.li>
              </Link>

              <div className="flex h-[46px] w-full items-center gap-1 px-2 pb-2">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="w-full" asChild>
                    <Button variant="ghost" size="sm" className="flex w-fit items-center gap-2 px-2">
                      <Avatar className="size-4 rounded">
                        <AvatarFallback className="bg-black text-[10px] text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <motion.li variants={variants} className="flex w-fit items-center gap-2">
                        {!isCollapsed && (
                          <>
                            <p className="text-sm font-medium">{config.workspace}</p>
                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
                          </>
                        )}
                      </motion.li>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild className="flex items-center gap-2">
                      <Link to={`${config.basePath}#profile`}>
                        <UserCog className="h-4 w-4" /> Manage profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="flex items-center gap-2">
                      <Link to={`${config.basePath}#integrations`}>
                        <Blocks className="h-4 w-4" /> Integrations
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`${config.basePath}#workspace`} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create workspace
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={isPinned}
                  aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                  title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                  className={cn(
                    'ml-auto h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground',
                    isPinned && config.active,
                    isCollapsed && 'ml-0',
                  )}
                  onClick={() => setIsPinned((current) => !current)}
                >
                  {isPinned ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex h-full w-full flex-col">
              <div className="flex grow flex-col gap-4">
                <ScrollArea className="h-16 grow p-2">
                  <div className="flex w-full flex-col gap-1">
                    {config.groups.map((group, groupIndex) => {
                      if (groupIndex > 0 && !showAdvanced) return null;
                      return (
                        <div key={groupIndex} className="flex flex-col gap-1">
                          {groupIndex > 0 && <Separator className="my-1 w-full" />}
                          {group.map((item) => (
                            <NavLinkItem
                              key={item.label}
                              item={item}
                              isCollapsed={isCollapsed}
                              isActive={activeHash === item.href || activePath === item.path}
                              activeClass={config.active}
                              basePath={config.basePath}
                            />
                          ))}
                        </div>
                      );
                    })}
                    {!showAdvanced && (
                      <button
                        type="button"
                        onClick={() => setNavExpanded(true)}
                        className="flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-primary"
                        title="Show more tools"
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span className="ml-2 text-sm font-medium">More tools</span>}
                      </button>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex flex-col p-2">
                <Link
                  to={`${config.basePath}#settings`}
                  className="mt-auto flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <motion.li variants={variants}>
                    {!isCollapsed && <p className="ml-2 text-sm font-medium">Settings</p>}
                  </motion.li>
                </Link>
                <div>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger className="w-full">
                      <div className="flex h-8 w-full flex-row items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary">
                        <Avatar className="size-4">
                          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                        </Avatar>
                        <motion.li variants={variants} className="flex w-full items-center gap-2">
                          {!isCollapsed && (
                            <>
                              <p className="text-sm font-medium">Account</p>
                              <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground/50" />
                            </>
                          )}
                        </motion.li>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent sideOffset={5}>
                      <div className="flex flex-row items-center gap-2 p-2">
                        <Avatar className="size-6">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-medium">{displayName}</span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">{user.email}</span>
                          <span className="text-xs text-muted-foreground/70">@{username}</span>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="flex items-center gap-2">
                        <Link to={`${config.basePath}#profile`}>
                          <UserCircle className="h-4 w-4" /> Edit profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="flex items-center gap-2">
                        <Link to={publicProfileUrl} target="_blank" rel="noreferrer">
                          <ArrowUpRight className="h-4 w-4" /> View public profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="flex items-center gap-2" onClick={handleSignOut}>
                        <LogOut className="h-4 w-4" /> Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </motion.ul>
      </motion.div>
    </motion.div>
  );
}
