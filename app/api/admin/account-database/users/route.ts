import { NextResponse } from "next/server";
import {
  classifyMemberActivity,
  type MemberActivityStatus,
} from "@/lib/memberActivity";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const EXTENDED_PROFILE_FIELDS = "id, full_name, email, role, member_type, balance, created_at, is_tester, tester_since, tester_updated_at";
const BASE_PROFILE_FIELDS = "id, full_name, email, role, member_type, balance, created_at, is_tester";

type ActivityRow = {
  user_id: string;
  last_activity_at: string | null;
};

type VisibleMemberActivity = {
  last_activity_at: string | null;
  activity_status: MemberActivityStatus;
};

export async function GET(request: Request) {
  const authorization = await requireAdminOrManager(request);

  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }

  try {
    let data;
    const { data: extendedData, error: extendedError } = await supabaseAdmin
      .from("profiles")
      .select(EXTENDED_PROFILE_FIELDS)
      .order("created_at", { ascending: false });

    if (extendedError) {
      const { data: baseData, error: baseError } = await supabaseAdmin
        .from("profiles")
        .select(BASE_PROFILE_FIELDS)
        .order("created_at", { ascending: false });

      if (baseError) {
        return NextResponse.json(
          { error: "Gagal memuat database akun." },
          { status: 500 },
        );
      }
      data = baseData;
    } else {
      data = extendedData;
    }

    const visibleUsers = (data ?? []).filter((profile) => {
      if (authorization.role !== "admin") {
        return true;
      }

      return profile.role?.toLowerCase() !== "manager";
    });

    const visibleMembers = visibleUsers.filter((profile) => {
      const role = profile.role?.toLowerCase();
      return role !== "admin" && role !== "manager";
    });
    const visibleMemberIds = new Set(visibleMembers.map((profile) => profile.id));

    const activityByMemberId = new Map<string, VisibleMemberActivity>();

    if (visibleMembers.length > 0) {
      const { data: activityData, error: activityError } = await supabaseAdmin.rpc(
        "get_member_last_activity_for_ids",
        { p_user_ids: [...visibleMemberIds] },
      );

      if (activityError) {
        return NextResponse.json(
          { error: "Gagal memuat aktivitas member." },
          { status: 500 },
        );
      }

      const activityRows = (activityData ?? []) as ActivityRow[];

      if (activityRows.length !== visibleMemberIds.size) {
        return NextResponse.json(
          { error: "Data aktivitas member tidak lengkap." },
          { status: 500 },
        );
      }

      const now = new Date();

      for (const activity of activityRows) {
        if (!visibleMemberIds.has(activity.user_id)) {
          return NextResponse.json(
            { error: "Data aktivitas member tidak valid." },
            { status: 500 },
          );
        }

        activityByMemberId.set(activity.user_id, {
          last_activity_at: activity.last_activity_at,
          activity_status: classifyMemberActivity(activity.last_activity_at, now),
        });
      }

      if (activityByMemberId.size !== visibleMemberIds.size) {
        return NextResponse.json(
          { error: "Data aktivitas member tidak lengkap." },
          { status: 500 },
        );
      }
    }

    const users = visibleUsers.map((profile) => {
      const activity = activityByMemberId.get(profile.id);

      return activity ? { ...profile, ...activity } : profile;
    });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json(
      { error: "Gagal memuat database akun." },
      { status: 500 },
    );
  }
}
