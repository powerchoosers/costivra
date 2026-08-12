"use client";

import { forwardRef } from "react";
import {
  AlignLeft as PhosphorAlignLeft,
  AlignRight as PhosphorAlignRight,
  Archive as PhosphorArchive,
  Bell as PhosphorBell,
  ArrowBendUpLeft as PhosphorArrowBendUpLeft,
  ArrowClockwise as PhosphorArrowClockwise,
  ArrowDown as PhosphorArrowDown,
  ArrowLeft as PhosphorArrowLeft,
  ArrowRight as PhosphorArrowRight,
  ArrowSquareOut as PhosphorArrowSquareOut,
  ArrowUUpLeft as PhosphorArrowUUpLeft,
  ArrowUUpRight as PhosphorArrowUUpRight,
  ArrowUp as PhosphorArrowUp,
  ArrowUpRight as PhosphorArrowUpRight,
  ArrowsIn as PhosphorArrowsIn,
  ArrowsOut as PhosphorArrowsOut,
  At as PhosphorAt,
  Bank as PhosphorBank,
  Broadcast as PhosphorBroadcast,
  Building as PhosphorBuilding,
  Buildings as PhosphorBuildings,
  Calendar as PhosphorCalendar,
  CalendarDots as PhosphorCalendarDots,
  Camera as PhosphorCamera,
  CaretLeft as PhosphorCaretLeft,
  CaretRight as PhosphorCaretRight,
  CaretUpDown as PhosphorCaretUpDown,
  Chat as PhosphorChat,
  ChatCircle as PhosphorChatCircle,
  ChatText as PhosphorChatText,
  Check as PhosphorCheck,
  CheckCircle as PhosphorCheckCircle,
  CheckSquare as PhosphorCheckSquare,
  ChartBar as PhosphorChartBar,
  ChartLine as PhosphorChartLine,
  CircleDashed as PhosphorCircleDashed,
  CircleNotch as PhosphorCircleNotch,
  Clipboard as PhosphorClipboard,
  ClipboardText as PhosphorClipboardText,
  Clock as PhosphorClock,
  ClockCounterClockwise as PhosphorClockCounterClockwise,
  CloudArrowUp as PhosphorCloudArrowUp,
  Copy as PhosphorCopy,
  CurrencyCircleDollar as PhosphorCurrencyCircleDollar,
  DotsSixVertical as PhosphorDotsSixVertical,
  DotsThree as PhosphorDotsThree,
  DotsThreeVertical as PhosphorDotsThreeVertical,
  Download as PhosphorDownload,
  Envelope as PhosphorEnvelope,
  EnvelopeOpen as PhosphorEnvelopeOpen,
  Eye as PhosphorEye,
  EyeSlash as PhosphorEyeSlash,
  File as PhosphorFile,
  FileArchive as PhosphorFileArchive,
  FileCode as PhosphorFileCode,
  FileLock as PhosphorFileLock,
  FileMagnifyingGlass as PhosphorFileMagnifyingGlass,
  FileText as PhosphorFileText,
  FileX as PhosphorFileX,
  Files as PhosphorFiles,
  Folder as PhosphorFolder,
  FolderOpen as PhosphorFolderOpen,
  Funnel as PhosphorFunnel,
  Gauge as PhosphorGauge,
  Gear as PhosphorGear,
  GearSix as PhosphorGearSix,
  Globe as PhosphorGlobe,
  GridFour as PhosphorGridFour,
  Handshake as PhosphorHandshake,
  Image as PhosphorImage,
  Info as PhosphorInfo,
  Key as PhosphorKey,
  Layout as PhosphorLayout,
  Lightning as PhosphorLightning,
  Link as PhosphorLink,
  List as PhosphorList,
  ListNumbers as PhosphorListNumbers,
  LockKey as PhosphorLockKey,
  MapPin as PhosphorMapPin,
  Minus as PhosphorMinus,
  Paperclip as PhosphorPaperclip,
  PaperPlaneTilt as PhosphorPaperPlaneTilt,
  Pause as PhosphorPause,
  Pencil as PhosphorPencil,
  PencilSimple as PhosphorPencilSimple,
  Phone as PhosphorPhone,
  Play as PhosphorPlay,
  Plus as PhosphorPlus,
  Pulse as PhosphorPulse,
  PushPin as PhosphorPushPin,
  Receipt as PhosphorReceipt,
  Rows as PhosphorRows,
  Scan as PhosphorScan,
  SealCheck as PhosphorSealCheck,
  MagnifyingGlass as PhosphorMagnifyingGlass,
  ShieldCheck as PhosphorShieldCheck,
  ShieldWarning as PhosphorShieldWarning,
  Sidebar as PhosphorSidebar,
  SidebarSimple as PhosphorSidebarSimple,
  Signature as PhosphorSignature,
  SquaresFour as PhosphorSquaresFour,
  Square as PhosphorSquare,
  Stack as PhosphorStack,
  Star as PhosphorStar,
  Storefront as PhosphorStorefront,
  Target as PhosphorTarget,
  TextAa as PhosphorTextAa,
  TextAlignCenter as PhosphorTextAlignCenter,
  TextB as PhosphorTextB,
  TextIndent as PhosphorTextIndent,
  TextItalic as PhosphorTextItalic,
  TextOutdent as PhosphorTextOutdent,
  TextStrikethrough as PhosphorTextStrikethrough,
  TextUnderline as PhosphorTextUnderline,
  Tray as PhosphorTray,
  Trash as PhosphorTrash,
  TrendUp as PhosphorTrendUp,
  Triangle as PhosphorTriangle,
  Upload as PhosphorUpload,
  User as PhosphorUser,
  UserCheck as PhosphorUserCheck,
  UserCircle as PhosphorUserCircle,
  UserCirclePlus as PhosphorUserCirclePlus,
  UsersThree as PhosphorUsersThree,
  Warehouse as PhosphorWarehouse,
  Warning as PhosphorWarning,
  WarningCircle as PhosphorWarningCircle,
  X as PhosphorX,
  Palette as PhosphorPalette,
  Question as PhosphorQuestion,
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon, IconProps as PhosphorIconProps, IconWeight } from "@phosphor-icons/react";

type CompatIconProps = Omit<PhosphorIconProps, "strokeWidth" | "weight"> & {
  absoluteStrokeWidth?: boolean;
  strokeWidth?: number | string;
  weight?: IconWeight;
};

function resolveWeight(strokeWidth?: number | string): IconWeight {
  const value = typeof strokeWidth === "string" ? Number.parseFloat(strokeWidth) : strokeWidth;
  if (value != null && value <= 1.25) return "light";
  if (value != null && value >= 2.5) return "bold";
  return "regular";
}

function adaptIcon(icon: PhosphorIcon) {
  return forwardRef<SVGSVGElement, CompatIconProps>(function CompatibleIcon(
    { absoluteStrokeWidth: _absoluteStrokeWidth, strokeWidth, weight, ...props },
    ref,
  ) {
    const IconComponent = icon;
    return <IconComponent ref={ref} {...props} weight={weight ?? resolveWeight(strokeWidth)} />;
  });
}

export const Activity = adaptIcon(PhosphorPulse);
export const AlertCircle = adaptIcon(PhosphorWarningCircle);
export const AlertTriangle = adaptIcon(PhosphorWarning);
export const AlignCenter = adaptIcon(PhosphorTextAlignCenter);
export const AlignLeft = adaptIcon(PhosphorAlignLeft);
export const AlignRight = adaptIcon(PhosphorAlignRight);
export const Archive = adaptIcon(PhosphorArchive);
export const Bell = adaptIcon(PhosphorBell);
export const ArrowDown = adaptIcon(PhosphorArrowDown);
export const ArrowLeft = adaptIcon(PhosphorArrowLeft);
export const ArrowRight = adaptIcon(PhosphorArrowRight);
export const ArrowUp = adaptIcon(PhosphorArrowUp);
export const ArrowUpRight = adaptIcon(PhosphorArrowUpRight);
export const ArrowBendUpLeft = adaptIcon(PhosphorArrowBendUpLeft);
export const ArrowUpLeft = adaptIcon(PhosphorArrowUUpLeft);
export const ArrowUUpLeft = adaptIcon(PhosphorArrowUUpLeft);
export const ArrowUUpRight = adaptIcon(PhosphorArrowUUpRight);
export const ArrowClockwise = adaptIcon(PhosphorArrowClockwise);
export const ArrowSquareOut = adaptIcon(PhosphorArrowSquareOut);
export const ArrowsIn = adaptIcon(PhosphorArrowsIn);
export const ArrowsOut = adaptIcon(PhosphorArrowsOut);
export const AtSign = adaptIcon(PhosphorAt);
export const BadgeCheck = adaptIcon(PhosphorSealCheck);
export const BarChart3 = adaptIcon(PhosphorChartBar);
export const Bold = adaptIcon(PhosphorTextB);
export const Building = adaptIcon(PhosphorBuilding);
export const Building2 = adaptIcon(PhosphorBuildings);
export const Calendar = adaptIcon(PhosphorCalendar);
export const CalendarClock = adaptIcon(PhosphorCalendarDots);
export const Camera = adaptIcon(PhosphorCamera);
export const CaretLeft = adaptIcon(PhosphorCaretLeft);
export const CaretRight = adaptIcon(PhosphorCaretRight);
export const CaretUpDown = adaptIcon(PhosphorCaretUpDown);
export const Check = adaptIcon(PhosphorCheck);
export const CheckCircle = adaptIcon(PhosphorCheckCircle);
export const CheckCircle2 = adaptIcon(PhosphorCheckCircle);
export const CheckSquare = adaptIcon(PhosphorCheckSquare);
export const ChartLine = adaptIcon(PhosphorChartLine);
export const ChevronDown = adaptIcon(PhosphorArrowDown);
export const ChevronLeft = adaptIcon(PhosphorArrowLeft);
export const ChevronRight = adaptIcon(PhosphorArrowRight);
export const ChevronUp = adaptIcon(PhosphorArrowUp);
export const CircleAlert = adaptIcon(PhosphorWarningCircle);
export const CircleCheck = adaptIcon(PhosphorCheckCircle);
export const CircleDashed = adaptIcon(PhosphorCircleDashed);
export const CircleDollarSign = adaptIcon(PhosphorCurrencyCircleDollar);
export const CircleHelp = adaptIcon(PhosphorQuestion);
export const CircleNotch = adaptIcon(PhosphorCircleNotch);
export const ClipboardList = adaptIcon(PhosphorClipboardText);
export const ClipboardPaste = adaptIcon(PhosphorClipboard);
export const Clock = adaptIcon(PhosphorClock);
export const Clock3 = adaptIcon(PhosphorClock);
export const Copy = adaptIcon(PhosphorCopy);
export const Download = adaptIcon(PhosphorDownload);
export const Edit2 = adaptIcon(PhosphorPencilSimple);
export const ExternalLink = adaptIcon(PhosphorArrowSquareOut);
export const Eye = adaptIcon(PhosphorEye);
export const EyeOff = adaptIcon(PhosphorEyeSlash);
export const File = adaptIcon(PhosphorFile);
export const FileCheck2 = adaptIcon(PhosphorFileArchive);
export const FileClock = adaptIcon(PhosphorFileText);
export const FileLock2 = adaptIcon(PhosphorFileLock);
export const FileSearch = adaptIcon(PhosphorFileMagnifyingGlass);
export const FileSignature = adaptIcon(PhosphorSignature);
export const FileText = adaptIcon(PhosphorFileText);
export const FileType2 = adaptIcon(PhosphorFileCode);
export const FileWarning = adaptIcon(PhosphorFileX);
export const Files = adaptIcon(PhosphorFiles);
export const Folder = adaptIcon(PhosphorFolder);
export const FolderOpen = adaptIcon(PhosphorFolderOpen);
export const Gauge = adaptIcon(PhosphorGauge);
export const Globe = adaptIcon(PhosphorGlobe);
export const Globe2 = adaptIcon(PhosphorGlobe);
export const Grid2X2 = adaptIcon(PhosphorSquaresFour);
export const Gear = adaptIcon(PhosphorGear);
export const GripVertical = adaptIcon(PhosphorDotsSixVertical);
export const Handshake = adaptIcon(PhosphorHandshake);
export const History = adaptIcon(PhosphorClockCounterClockwise);
export const Hotel = adaptIcon(PhosphorBuildings);
export const ImagePlus = adaptIcon(PhosphorImage);
export const Inbox = adaptIcon(PhosphorTray);
export const IndentDecrease = adaptIcon(PhosphorTextOutdent);
export const IndentIncrease = adaptIcon(PhosphorTextIndent);
export const Info = adaptIcon(PhosphorInfo);
export const Italic = adaptIcon(PhosphorTextItalic);
export const KeyRound = adaptIcon(PhosphorKey);
export const Landmark = adaptIcon(PhosphorBank);
export const Layers = adaptIcon(PhosphorStack);
export const Layout = adaptIcon(PhosphorLayout);
export const LayoutDashboard = adaptIcon(PhosphorLayout);
export const LayoutList = adaptIcon(PhosphorRows);
export const Link2 = adaptIcon(PhosphorLink);
export const List = adaptIcon(PhosphorList);
export const ListFilter = adaptIcon(PhosphorFunnel);
export const ListOrdered = adaptIcon(PhosphorListNumbers);
export const LoaderCircle = adaptIcon(PhosphorCircleNotch);
export const LockKeyhole = adaptIcon(PhosphorLockKey);
export const Mail = adaptIcon(PhosphorEnvelope);
export const MailOpen = adaptIcon(PhosphorEnvelopeOpen);
export const MagnifyingGlass = adaptIcon(PhosphorMagnifyingGlass);
export const MapPin = adaptIcon(PhosphorMapPin);
export const Maximize2 = adaptIcon(PhosphorArrowsOut);
export const Menu = adaptIcon(PhosphorList);
export const MessageCircle = adaptIcon(PhosphorChatCircle);
export const MessageSquare = adaptIcon(PhosphorChat);
export const MessageSquareText = adaptIcon(PhosphorChatText);
export const Minimize2 = adaptIcon(PhosphorArrowsIn);
export const Minus = adaptIcon(PhosphorMinus);
export const MoreHorizontal = adaptIcon(PhosphorDotsThree);
export const MoreVertical = adaptIcon(PhosphorDotsThreeVertical);
export const Palette = adaptIcon(PhosphorPalette);
export const PanelLeftClose = adaptIcon(PhosphorSidebarSimple);
export const PanelLeftOpen = adaptIcon(PhosphorSidebar);
export const Paperclip = adaptIcon(PhosphorPaperclip);
export const Pause = adaptIcon(PhosphorPause);
export const Pencil = adaptIcon(PhosphorPencil);
export const Phone = adaptIcon(PhosphorPhone);
export const Pin = adaptIcon(PhosphorPushPin);
export const Play = adaptIcon(PhosphorPlay);
export const Plus = adaptIcon(PhosphorPlus);
export const RadioTower = adaptIcon(PhosphorBroadcast);
export const Receipt = adaptIcon(PhosphorReceipt);
export const ReceiptText = adaptIcon(PhosphorReceipt);
export const Redo2 = adaptIcon(PhosphorArrowUUpRight);
export const RefreshCw = adaptIcon(PhosphorArrowClockwise);
export const RemoveFormatting = adaptIcon(PhosphorTextAa);
export const Reply = adaptIcon(PhosphorArrowBendUpLeft);
export const RotateCcw = adaptIcon(PhosphorArrowClockwise);
export const ScanSearch = adaptIcon(PhosphorScan);
export const School = adaptIcon(PhosphorBuildings);
export const Search = adaptIcon(PhosphorMagnifyingGlass);
export const Send = adaptIcon(PhosphorPaperPlaneTilt);
export const Settings = adaptIcon(PhosphorGear);
export const Settings2 = adaptIcon(PhosphorGearSix);
export const ShieldAlert = adaptIcon(PhosphorShieldWarning);
export const ShieldCheck = adaptIcon(PhosphorShieldCheck);
export const Square = adaptIcon(PhosphorSquare);
export const Star = adaptIcon(PhosphorStar);
export const Store = adaptIcon(PhosphorStorefront);
export const Strikethrough = adaptIcon(PhosphorTextStrikethrough);
export const Target = adaptIcon(PhosphorTarget);
export const Trash2 = adaptIcon(PhosphorTrash);
export const TrendingUp = adaptIcon(PhosphorTrendUp);
export const TriangleAlert = adaptIcon(PhosphorWarning);
export const Underline = adaptIcon(PhosphorTextUnderline);
export const Undo2 = adaptIcon(PhosphorArrowUUpLeft);
export const Upload = adaptIcon(PhosphorUpload);
export const UploadCloud = adaptIcon(PhosphorCloudArrowUp);
export const User = adaptIcon(PhosphorUser);
export const UserCheck = adaptIcon(PhosphorUserCheck);
export const UserPlus = adaptIcon(PhosphorUserCirclePlus);
export const UserRound = adaptIcon(PhosphorUserCircle);
export const UserRoundCheck = adaptIcon(PhosphorUserCheck);
export const Users = adaptIcon(PhosphorUsersThree);
export const Warehouse = adaptIcon(PhosphorWarehouse);
export const Zap = adaptIcon(PhosphorLightning);
export const X = adaptIcon(PhosphorX);
