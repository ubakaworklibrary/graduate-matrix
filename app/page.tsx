import GraduateMatrixApp from "../components/graduate-matrix/GraduateMatrixApp";
import LoginForm from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";
import { loadAuthenticatedCandidateProfile } from "@/lib/graduate-matrix/repositories/candidate-profile";
import { mapCandidateProfile } from "@/lib/graduate-matrix/mappers/candidate-profile";
import { loadCandidateBaseline } from "@/lib/graduate-matrix/repositories/candidate-baseline";
import { mapCandidateBaseline } from "@/lib/graduate-matrix/mappers/candidate-baseline";
import { getBaselineReadiness } from "@/lib/graduate-matrix/readiness";
import { loadCandidateCompetencies } from "@/lib/graduate-matrix/repositories/candidate-competencies";
import { mapCandidateCompetencies } from "@/lib/graduate-matrix/mappers/candidate-competencies";
import { COMPETENCY_DEFINITIONS } from "@/lib/graduate-matrix/data/competencies";
import { loadCandidatePortfolio } from "@/lib/graduate-matrix/repositories/candidate-portfolio";
import { mapCandidatePortfolio } from "@/lib/graduate-matrix/mappers/candidate-portfolio";
import { loadCandidateMeetingLog } from "@/lib/graduate-matrix/repositories/candidate-meeting-log";
import { mapCandidateMeetingLog } from "@/lib/graduate-matrix/mappers/candidate-meeting-log";
import { loadCandidateCpd } from "@/lib/graduate-matrix/repositories/candidate-cpd";
import { mapCandidateCpd } from "@/lib/graduate-matrix/mappers/candidate-cpd";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginForm />;
  }

  const profileResult = await loadAuthenticatedCandidateProfile(user.id);

  if (profileResult.status === "error") {
    return (
      <GraduateMatrixApp
        candidateState="error"
        candidate={null}
        baseline={null}
        matrix={null}
        portfolio={null}
        meetingLog={null}
        cpdLog={null}
      />
    );
  }

  if (profileResult.status === "not-found") {
    return (
      <GraduateMatrixApp
        candidateState="not-linked"
        candidate={null}
        baseline={null}
        matrix={null}
        portfolio={null}
        meetingLog={null}
        cpdLog={null}
      />
    );
  }

  const mappingResult = mapCandidateProfile(profileResult.rows);

  if (mappingResult.status === "incomplete") {
    return (
      <GraduateMatrixApp
        candidateState="incomplete"
        candidate={null}
        baseline={null}
        matrix={null}
        portfolio={null}
        meetingLog={null}
        cpdLog={null}
      />
    );
  }

  const candidate = mappingResult.candidate;
  const [
    baselineResult,
    competencyResult,
    portfolioResult,
    meetingLogResult,
    cpdResult,
  ] = await Promise.all([
    loadCandidateBaseline(candidate.id),
    loadCandidateCompetencies(candidate.id),
    loadCandidatePortfolio(candidate.id),
    loadCandidateMeetingLog(candidate.id),
    loadCandidateCpd(candidate.id),
  ]);

  let baseline;

  if (baselineResult.status === "error") {
    baseline = { state: "error" as const, setup: null, readiness: null };
  } else {
    const baselineMapping = mapCandidateBaseline(baselineResult.rows);

    if (baselineMapping.status === "definition-mismatch") {
      baseline = {
        state: "definition-mismatch" as const,
        setup: null,
        readiness: null,
      };
    } else {
      const readiness = getBaselineReadiness(
        {
          firstName: candidate.firstName,
          surname: candidate.surname,
          schemeStartDate: candidate.schemeStartDate,
          mentorName: candidate.mentorName,
          lineManagerName: candidate.lineManagerName,
          reviewerName: candidate.reviewerName,
          primaryOutcome: candidate.pathway.primaryOutcome,
        },
        baselineMapping.setup?.tasks ?? {},
      );

      baseline = {
        state: baselineMapping.setup
          ? ("loaded" as const)
          : ("not-configured" as const),
        setup: baselineMapping.setup,
        readiness,
      };
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  let portfolio;

  if (portfolioResult.status === "error") {
    portfolio = {
      state: "error" as const,
      evidence: [],
      competencyLinks: [],
      actions: [],
      actionLinks: [],
      verificationEvents: [],
      today,
    };
  } else {
    const portfolioMapping = mapCandidatePortfolio(
      candidate.id,
      portfolioResult.rows,
    );

    if (portfolioMapping.status === "integrity-error") {
      console.error(
        "Graduate Matrix Portfolio mapping found inconsistent persisted data.",
      );
    }

    portfolio =
      portfolioMapping.status === "integrity-error"
        ? {
            state: "integrity-error" as const,
            evidence: [],
            competencyLinks: [],
            actions: [],
            actionLinks: [],
            verificationEvents: [],
            today,
          }
        : {
            state: "loaded" as const,
            ...portfolioMapping.data,
            today,
          };
  }

  let matrix;

  if (competencyResult.status === "error") {
    matrix = {
      state: "error" as const,
      definitions: COMPETENCY_DEFINITIONS,
      records: {},
      cycles: {},
    };
  } else {
    const competencyMapping = mapCandidateCompetencies(competencyResult.rows);

    matrix =
      competencyMapping.status === "integrity-error"
        ? {
            state: "integrity-error" as const,
            definitions: COMPETENCY_DEFINITIONS,
            records: {},
            cycles: {},
          }
        : {
            state: "loaded" as const,
            definitions: COMPETENCY_DEFINITIONS,
            records: competencyMapping.data.records,
            cycles: competencyMapping.data.cycles,
          };
  }

  let meetingLog;

  if (meetingLogResult.status === "error") {
    meetingLog = { state: "error" as const, reviews: [], meetings: [] };
  } else {
    const meetingLogMapping = mapCandidateMeetingLog(
      candidate.id,
      meetingLogResult.rows,
    );

    if (meetingLogMapping.status === "integrity-error") {
      console.error(
        "Graduate Matrix Meeting Log mapping found inconsistent persisted data.",
      );
    }

    meetingLog =
      meetingLogMapping.status === "integrity-error"
        ? { state: "integrity-error" as const, reviews: [], meetings: [] }
        : { state: "loaded" as const, ...meetingLogMapping.data };
  }

  let cpdLog;

  if (cpdResult.status === "error") {
    cpdLog = {
      state: "error" as const,
      entries: [],
      competencyLinks: [],
      evidence: [],
      evidenceCompetencyLinks: [],
      includesEvidenceCpd: false,
      today,
    };
  } else {
    const cpdMapping = mapCandidateCpd(candidate.id, cpdResult.rows);

    if (cpdMapping.status === "integrity-error") {
      console.error(
        "Graduate Matrix CPD mapping found inconsistent persisted data.",
      );
    }

    const portfolioAvailable = portfolio.state === "loaded";
    cpdLog =
      cpdMapping.status === "integrity-error"
        ? {
            state: "integrity-error" as const,
            entries: [],
            competencyLinks: [],
            evidence: [],
            evidenceCompetencyLinks: [],
            includesEvidenceCpd: false,
            today,
          }
        : {
            state: "loaded" as const,
            ...cpdMapping.data,
            evidence: portfolioAvailable ? portfolio.evidence : [],
            evidenceCompetencyLinks: portfolioAvailable
              ? portfolio.competencyLinks
              : [],
            includesEvidenceCpd: portfolioAvailable,
            today,
          };
  }

  return (
    <GraduateMatrixApp
      candidateState="loaded"
      candidate={candidate}
      baseline={baseline}
      matrix={matrix}
      portfolio={portfolio}
      meetingLog={meetingLog}
      cpdLog={cpdLog}
    />
  );
}
