import { Bug, Lightbulb, Code, BookOpen, type LucideIcon } from "lucide-react";

export interface Suggestion {
  title: string;
  icon: LucideIcon;
}

export const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    title: "Help me debug this React component",
    icon: Bug,
  },
  {
    title: "Explain quantum computing simply",
    icon: Lightbulb,
  },
  {
    title: "Write a Python script for data analysis",
    icon: Code,
  },
  {
    title: "Review my code for best practices",
    icon: BookOpen,
  },
];

export const CODING_SUGGESTIONS: Suggestion[] = [
  {
    title: "Help me debug this React component",
    icon: Bug,
  },
  {
    title: "Review my code for best practices",
    icon: BookOpen,
  },
  {
    title: "Write a Python script for data analysis",
    icon: Code,
  },
  {
    title: "Optimize this algorithm for performance",
    icon: Code,
  },
];

export const LEARNING_SUGGESTIONS: Suggestion[] = [
  {
    title: "Explain quantum computing simply",
    icon: Lightbulb,
  },
  {
    title: "What are the latest trends in AI?",
    icon: Lightbulb,
  },
  {
    title: "How does blockchain technology work?",
    icon: Lightbulb,
  },
  {
    title: "Explain machine learning concepts",
    icon: Lightbulb,
  },
];
