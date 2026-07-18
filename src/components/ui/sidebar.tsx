import { useEffect, useState } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ChevronsUpDown,
  FileClock,
  GraduationCap,
  Layers,
  Layout,
  LayoutDashboard,
  Sunrise,
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
  Sparkles,
  Target,
  UserCircle,
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
import { getKindeLogoutUri, isKindeConfigured } from '@/lib/kinde-auth';
import type { AgentChatThread, AppUser } from '@/lib/apparent-types';

type DashboardRole = 'founder' | 'investor';

interface SessionNavBarProps {
  role: DashboardRole;
  user: AppUser;
  /** When false, advanced nav groups are tucked behind a "More" expander
      until the user has set up their workspace (progressive disclosure). */
  activated?: boolean;
  /** Unread DM count — badged on the Messages nav item. */
  unreadMessages?: number;
  /** Durable Apparent Agent conversations shown beneath the Agent destination. */
  agentThreads?: AgentChatThread[];
  activeAgentThreadId?: string | null;
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
  /** Canonical URL path for this section. Always set on real nav items. */
  path: string;
  icon: LucideIcon;
  badge?: string;
}

const SIDEBAR_PIN_STORAGE_KEY = 'apparent-sidebar-pinned';

const sidebarVariants = {
  open: {
    width: '16.25rem',
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
    accent: 'text-[#039861]',
    active: 'bg-[#039861] text-white',
    basePath: '/dashboard/founder',
    groups: [
      [
        { label: 'Overview', path: '/dashboard/founder', icon: LayoutDashboard },
        { label: 'Apparent Agent', path: '/dashboard/founder/agent', icon: Sparkles },
        { label: 'Your Profile', path: '/dashboard/founder/profile', icon: UserCircle },
        { label: 'Products', path: '/dashboard/founder/products', icon: Rocket },
        { label: 'Investor Matches', path: '/dashboard/founder/matches', icon: Search, badge: 'AI' },
        { label: 'VC heatmap', path: '/dashboard/founder/vc-heatmap', icon: Map, badge: 'VC' },
        { label: 'Cold Outreach', path: '/dashboard/founder/outreach', icon: Send, badge: 'New' },
        { label: 'Messages', path: '/dashboard/founder/messages', icon: MessagesSquare },
      ],
      [
        { label: 'Fundraise Tracker', path: '/dashboard/founder/deals', icon: Layout },
      ],
      [
        { label: 'How to Use Apparent?', path: '/dashboard/founder/knowledge', icon: GraduationCap },
        { label: 'Feedback', path: '/dashboard/founder/feedback', icon: MessageSquareText },
      ],
    ] as NavItem[][],
  },
  investor: {
    workspace: 'Investor Workspace',
    account: 'Investor Account',
    email: 'partner@apparent.test',
    initials: 'VC',
    accent: 'text-[#003f2e]',
    active: 'bg-[#003f2e] text-white',
    basePath: '/dashboard/investor',
    groups: [
      [
        { label: 'Overview', path: '/dashboard/investor', icon: LayoutDashboard },
        { label: 'Apparent Agent', path: '/dashboard/investor/agent', icon: Sparkles },
        { label: 'Daily', path: '/dashboard/investor/daily', icon: Sunrise, badge: 'New' },
        { label: 'Your Thesis', path: '/dashboard/investor/profile', icon: Target },
        { label: 'Discover', path: '/dashboard/investor/discover', icon: Layers, badge: 'New' },
        { label: 'Builder Discovery', path: '/dashboard/investor/matches', icon: Search, badge: 'AI' },
        { label: 'Messages', path: '/dashboard/investor/messages', icon: MessagesSquare },
      ],
      [
        { label: 'Deal Flow', path: '/dashboard/investor/deals', icon: Layout },
        { label: 'Terms Review', path: '/dashboard/investor/terms', icon: FileClock },
      ],
      [
        { label: 'How to Use Apparent?', path: '/dashboard/investor/knowledge', icon: GraduationCap },
        { label: 'Feedback', path: '/dashboard/investor/feedback', icon: MessageSquareText },
      ],
    ] as NavItem[][],
  },
};

const NavLinkItem = ({
  item,
  isCollapsed,
  isActive,
  activeClass,
  unreadCount = 0,
}: {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
  activeClass: string;
  /** Numeric unread badge (e.g. unread DMs). 0 = hidden. */
  unreadCount?: number;
}) => {
  const Icon = item.icon;
  const to = item.path;

  return (
    <Link
      to={to}
      className={cn(
        'flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-[#f2f2f2] hover:text-[#222222]',
        isActive && activeClass,
      )}
    >
      <span className="relative shrink-0">
        <Icon className="h-4 w-4" />
        {/* Collapsed sidebar: a dot stands in for the numeric badge. */}
        {isCollapsed && unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </span>
      <motion.li variants={variants}>
        {!isCollapsed && (
          <div className="ml-2 flex items-center gap-2">
            <p className="text-sm font-medium">{item.label}</p>
            {item.badge && (
              <Badge
                className="flex h-fit w-fit items-center rounded border-none bg-[#fa5d29] px-1.5 text-[10px] font-semibold text-white"
                variant="outline"
              >
                {item.badge}
              </Badge>
            )}
            {unreadCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        )}
      </motion.li>
    </Link>
  );
};

export function SessionNavBar(props: SessionNavBarProps) {
  if (isKindeConfigured) {
    return <KindeSessionNavBar {...props} />;
  }

  return <BaseSessionNavBar {...props} />;
}

const KindeSessionNavBar = (props: SessionNavBarProps) => {
  const { logout } = useKindeAuth();

  const handleKindeSignOut = async () => {
    await signOut();
    await logout({ redirectUrl: getKindeLogoutUri() });
  };

  return <BaseSessionNavBar {...props} onSignOut={handleKindeSignOut} />;
};

function BaseSessionNavBar({
  role,
  user,
  activated = true,
  unreadMessages = 0,
  agentThreads = [],
  activeAgentThreadId = null,
  onSignOut,
}: SessionNavBarProps & { onSignOut?: () => Promise<void> }) {
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
  const isCollapsed = !isPinned && !isHovered;
  // Progressive disclosure: keep advanced groups hidden for brand-new users
  // until they activate — but never hide the group containing the active view.
  const advancedItems = config.groups.slice(1).flat();
  const activeInAdvanced = advancedItems.some((item) => item.path === activePath);
  const showAdvanced = activated || navExpanded || activeInAdvanced;
  const displayName = deriveDisplayName(user.email);
  const initials = deriveInitials(user.email);
  const username = user.username ?? deriveUsername(user.email);
  const publicProfileUrl = `/@${username}`;

  const handleSignOut = async () => {
    if (onSignOut) {
      await onSignOut();
    } else {
      await signOut();
      navigate('/login');
    }
  };

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_PIN_STORAGE_KEY, String(isPinned));
    window.dispatchEvent(new CustomEvent('apparent-sidebar-pin-change', { detail: { isPinned } }));
  }, [isPinned]);

  return (
    <motion.div
      className="sidebar ed-dashboard-sidebar fixed left-0 top-0 z-40 h-screen shrink-0 border-r border-black/10"
      data-role={role}
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
              <div className="relative flex h-[50px] w-full items-center justify-start gap-2 px-2">
                <Link
                  to={`${config.basePath}`}
                  className={cn(
                    'flex items-center gap-2 transition hover:opacity-80',
                    isCollapsed ? 'justify-center' : 'min-w-0 flex-1',
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={isPinned}
                  aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                  title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                  className={cn(
                    'h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground',
                    isPinned && config.active,
                    isCollapsed && 'absolute right-0 translate-x-full rounded-l-none rounded-r-md border border-l-0 border-black/10 bg-white shadow-sm',
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
                          {group.map((item) => {
                            const isAgentItem = item.path.endsWith('/agent');
                            return (
                              <div key={item.label}>
                                <div className="relative">
                                  <NavLinkItem
                                    item={item}
                                    isCollapsed={isCollapsed}
                                    isActive={activePath === item.path}
                                    activeClass={config.active}
                                    unreadCount={item.path.endsWith('/messages') ? unreadMessages : 0}
                                  />
                                  {isAgentItem && !isCollapsed && (
                                    <Link
                                      to={item.path}
                                      aria-label="Start a new Agent conversation"
                                      title="New conversation"
                                      className={cn(
                                        'absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md transition-colors',
                                        activePath === item.path
                                          ? 'text-white/70 hover:bg-white/15 hover:text-white'
                                          : 'text-gray-400 hover:bg-black/[0.06] hover:text-black',
                                      )}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </Link>
                                  )}
                                </div>

                                {isAgentItem && !isCollapsed && agentThreads.length > 0 && (
                                  <div className="ml-3 mt-1 space-y-0.5 border-l border-black/10 pl-2">
                                    {agentThreads.map((thread) => {
                                      const threadPath = `${item.path}?thread=${encodeURIComponent(thread.id)}`;
                                      const isCurrent = activePath === item.path && activeAgentThreadId === thread.id;
                                      return (
                                        <Link
                                          key={thread.id}
                                          to={threadPath}
                                          title={thread.title}
                                          className={cn(
                                            'flex h-7 min-w-0 items-center gap-2 rounded-md px-2 text-xs transition-colors',
                                            isCurrent
                                              ? 'bg-black/[0.07] font-semibold text-[#222]'
                                              : 'text-gray-500 hover:bg-black/[0.04] hover:text-[#222]',
                                          )}
                                        >
                                          <MessageSquareText className="h-3 w-3 shrink-0 opacity-60" />
                                          <span className="truncate">{thread.title}</span>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
                  to={`${config.basePath}/settings`}
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
                        <Link to={`${config.basePath}/profile`}>
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
