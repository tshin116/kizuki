import { notFound, redirect } from "next/navigation";
import { MOODS } from "@/lib/conversation/constants";
import type { Mood } from "@/lib/conversation/types";
import { getStudent } from "@/lib/db/repository";
import ChatScreen from "./ChatScreen";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ mood?: string }>;
}) {
  const { studentId } = await params;
  const { mood } = await searchParams;

  const student = getStudent(studentId);
  if (!student) notFound();
  if (!mood || !MOODS[mood as Mood]) redirect(`/student/${studentId}`);

  return (
    <ChatScreen
      studentId={student.id}
      studentName={student.name}
      mood={mood as Mood}
    />
  );
}
