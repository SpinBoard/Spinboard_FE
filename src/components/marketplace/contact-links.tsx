"use client";

import { Phone, Mail, MessageCircle, Globe, Instagram, Facebook, Twitter, Linkedin, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessProfile } from "@/types";

// A business only needed one contact method to get listed — hide whichever
// fields are blank rather than showing empty rows.
export function ContactLinks({ business }: { business: BusinessProfile }) {
  const waDigits = business.whatsappNumber?.replace(/\D/g, "");
  const links: { href: string; label: string; icon: typeof Phone }[] = [];

  if (business.contactPhone) {
    links.push({ href: `tel:${business.contactPhone}`, label: "Call", icon: Phone });
  }
  if (business.contactEmail) {
    links.push({ href: `mailto:${business.contactEmail}`, label: "Email", icon: Mail });
  }
  if (waDigits) {
    links.push({ href: `https://wa.me/${waDigits}`, label: "WhatsApp", icon: MessageCircle });
  }

  const social = business.socialLinks ?? {};
  const socialLinks: { href: string; label: string; icon: typeof Globe }[] = [
    social.website && { href: social.website, label: "Website", icon: Globe },
    social.instagram && { href: social.instagram, label: "Instagram", icon: Instagram },
    social.facebook && { href: social.facebook, label: "Facebook", icon: Facebook },
    social.twitter && { href: social.twitter, label: "Twitter", icon: Twitter },
    social.linkedin && { href: social.linkedin, label: "LinkedIn", icon: Linkedin },
    social.youtube && { href: social.youtube, label: "YouTube", icon: Youtube },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Globe }[];

  if (links.length === 0 && socialLinks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-white/10">
            <link.icon className="h-3.5 w-3.5 mr-1.5" />
            {link.label}
          </Button>
        </a>
      ))}
      {socialLinks.map((link) => (
        <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-white/5">
            <link.icon className="h-3.5 w-3.5 mr-1.5" />
            {link.label}
          </Button>
        </a>
      ))}
    </div>
  );
}
