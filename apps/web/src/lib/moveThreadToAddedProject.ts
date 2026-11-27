import { thrownErrorMessage } from "@t3tools/client-runtime/errors";
import {
  isAtomCommandInterrupted,
  runAtomCommand,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import type { EnvironmentId, ProjectId, ScopedThreadRef } from "@t3tools/contracts";
import { msg } from "gt-react";

import { openMoveThread } from "../components/MoveThreadDialog";
import { stackedThreadToast, toastManager } from "../components/ui/toast";
import { m } from "../i18n/messages";
import { appAtomRegistry } from "../rpc/atomRegistry";
import { threadEnvironment } from "../state/threads";
import { waitForClone } from "./addProjectToMachine";

interface AddedProject {
  readonly environmentId: EnvironmentId;
  readonly id: ProjectId;
}

/** A project on another machine takes the thread through the move-to-machine dialog. */
export async function moveThreadToAddedProject(
  threadRef: ScopedThreadRef,
  project: AddedProject,
): Promise<void> {
  if (project.environmentId !== threadRef.environmentId) {
    openMoveThread({
      threadRef,
      targetEnvironmentId: project.environmentId,
      projectId: project.id,
    });
    return;
  }
  const result = await runAtomCommand(
    appAtomRegistry,
    threadEnvironment.updateMetadata,
    {
      environmentId: threadRef.environmentId,
      input: { threadId: threadRef.threadId, projectId: project.id },
    },
    { reportFailure: false },
  );
  if (result._tag !== "Success" && !isAtomCommandInterrupted(result)) {
    toastManager.add(
      stackedThreadToast({
        type: "error",
        title: m(msg("Could not move thread")),
        description:
          thrownErrorMessage(squashAtomCommandFailure(result), m) ?? m(msg("An error occurred.")),
      }),
    );
  }
}

/** A project still cloning has no checkout to work in, so the thread moves once the clone is done. */
export function moveThreadAfterClone(threadRef: ScopedThreadRef, project: AddedProject): void {
  void waitForClone(project.environmentId, project.id).then((clone) =>
    clone === null ? undefined : moveThreadToAddedProject(threadRef, project),
  );
}
