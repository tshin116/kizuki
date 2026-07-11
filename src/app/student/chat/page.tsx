import { redirect } from "next/navigation";
import { MOODS } from "@/lib/conversation/constants";
import type { Mood } from "@/lib/conversation/types";
import { getCurrentStudentId } from "@/lib/current-student";
import { getStudent } from "@/lib/db/repository";
import ChatScreen from "./ChatScreen";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ mood?: string }>;
}) {
  const { mood } = await searchParams;

  const studentId = await getCurrentStudentId();
  const student = studentId ? getStudent(studentId) : null;
  if (!student) redirect("/student");
  if (!mood || !MOODS[mood as Mood]) redirect("/student");

  return (
    <ChatScreen
      studentId={student.id}
      studentName={student.name}
      mood={mood as Mood}
    />
  );
}
