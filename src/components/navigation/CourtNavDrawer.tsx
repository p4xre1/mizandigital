"use client";

import * as React from "react";
import { Link } from "react-router";
import { COURT_RULINGS_AND_DOCTRINE } from "../../data/courtRulingsData";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../ui/accordion";
import { Scale, BookOpen } from "lucide-react";

export interface CourtNavDrawerProps {
  onSelect?: () => void;
}

export const CourtNavDrawer: React.FC<CourtNavDrawerProps> = ({
  onSelect,
}): React.JSX.Element => {
  return (
    <div className="w-full space-y-4 px-2 py-4">
      <Accordion type="multiple" className="w-full">
        {COURT_RULINGS_AND_DOCTRINE.map((section) => (
          <AccordionItem key={section.id} value={section.id} className="border-b-0">
            <AccordionTrigger className="py-3 text-base font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                {section.id === "court-rulings" ? (
                  <Scale className="size-5 text-primary" />
                ) : (
                  <BookOpen className="size-5 text-primary" />
                )}
                <span>{section.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-1 pl-7 rtl:pl-0 rtl:pr-7 pt-1">
                {section.subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    to={`/category/${sub.slug}`}
                    onClick={onSelect}
                    className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ltr:text-left rtl:text-right"
                  >
                    <div className="font-medium text-foreground">{sub.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {sub.description}
                    </div>
                  </Link>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default CourtNavDrawer;