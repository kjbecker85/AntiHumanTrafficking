import type { ReactElement } from "react";
import {
  BadgeHelp,
  Building2,
  CarFront,
  FileText,
  IdCard,
  Mail,
  MapPinned,
  ShieldAlert,
  Smartphone,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { EntityType } from "@/lib/types";
import { formatEntityType } from "@/lib/format";

interface EntityTypeGlyphProps {
  type: EntityType;
  className?: string;
  strokeWidth?: number;
}

export function EntityTypeGlyph({
  type,
  className = "h-5 w-5",
  strokeWidth = 1.9,
}: EntityTypeGlyphProps): ReactElement {
  switch (type) {
    case "person":
      return <UserRound className={className} strokeWidth={strokeWidth} />;
    case "suspect":
      return <ShieldAlert className={className} strokeWidth={strokeWidth} />;
    case "victim":
      return <IdCard className={className} strokeWidth={strokeWidth} />;
    case "associate":
      return <UsersRound className={className} strokeWidth={strokeWidth} />;
    case "unknown_person":
      return <BadgeHelp className={className} strokeWidth={strokeWidth} />;
    case "phone":
      return <Smartphone className={className} strokeWidth={strokeWidth} />;
    case "email":
      return <Mail className={className} strokeWidth={strokeWidth} />;
    case "vehicle":
      return <CarFront className={className} strokeWidth={strokeWidth} />;
    case "license_plate":
      return <IdCard className={className} strokeWidth={strokeWidth} />;
    case "location":
      return <MapPinned className={className} strokeWidth={strokeWidth} />;
    case "organization":
      return <Building2 className={className} strokeWidth={strokeWidth} />;
    case "account":
      return <WalletCards className={className} strokeWidth={strokeWidth} />;
    case "document":
      return <FileText className={className} strokeWidth={strokeWidth} />;
    default:
      return <BadgeHelp className={className} strokeWidth={strokeWidth} />;
  }
}

export function getEntityTypeLabel(type: EntityType): string {
  return formatEntityType(type);
}
