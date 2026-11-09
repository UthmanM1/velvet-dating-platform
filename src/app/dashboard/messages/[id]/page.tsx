import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blockAction } from "@/app/actions/member";
import { ChatPanel, ReportForm, SubmitButton } from "@/components/forms";
import { OnlineDot } from "@/components/ui";
import { getFullThreadForRoute } from "@/app/api/messages/helpers";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const thread = await getFullThreadForRoute(user, id);
  if (!thread) notFound();
  return (
    <div>
      <Link href="/dashboard/messages" className="text-sm text-muted hover:text-champagne">← All messages</Link>
      <div className="card mt-4 p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <Link href={`/discover/${thread.other.id}`} className="flex items-center gap-3"><Image src={`/api/avatar/${thread.other.id}`} alt="" width={44} height={44} unoptimized className="h-11 w-11 rounded-full object-cover" /><span><span className="block text-xl">{thread.other.displayName}</span><OnlineDot online={thread.other.online} /></span></Link>
          <div className="flex items-start gap-2"><ReportForm targetId={thread.other.id} /><form action={blockAction}><input type="hidden" name="targetId" value={thread.other.id} /><SubmitButton className="btn btn-ghost btn-sm">Block</SubmitButton></form></div>
        </div>
        <ChatPanel conversationId={id} otherId={thread.other.id} initial={thread} />
        <p className="mt-3 text-xs text-muted">Demo mode: messages refresh every few seconds, and fictional members reply automatically. Supabase Realtime can replace polling when configured.</p>
      </div>
    </div>
  );
}
