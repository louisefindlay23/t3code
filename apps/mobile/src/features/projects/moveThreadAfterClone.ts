import type { EnvironmentId, ProjectCloneSnapshot, ProjectId, ThreadId } from "@t3tools/contracts";

import { rootNavigationRef } from "../../lib/rootNavigation";
import { appAtomRegistry } from "../../state/atom-registry";
import { environmentProjectCloneListAtom } from "../../state/projectClones";
import { moveThreadToProject } from "../threads/moveThreadToProject";

/** Resolves when the clone finishes, or null once it is removed. A failed clone keeps waiting for its retry. */
function waitForClone(environmentId: EnvironmentId, projectId: ProjectId) {
  return new Promise<ProjectCloneSnapshot | null>((resolve) => {
    const atom = environmentProjectCloneListAtom(environmentId);
    let seen = false;
    let unsubscribe: (() => void) | null = null;
    const check = (clones: ReadonlyArray<ProjectCloneSnapshot>) => {
      const clone = clones.find((candidate) => candidate.projectId === projectId);
      if (clone) seen = true;
      const result = clone?.phase === "done" ? clone : !clone && seen ? null : undefined;
      if (result === undefined) return;
      unsubscribe?.();
      resolve(result);
    };
    unsubscribe = appAtomRegistry.subscribe(atom, check);
    check(appAtomRegistry.get(atom));
  });
}

/** A project still cloning has no checkout to work in, so the thread moves once the clone is done. */
export function moveThreadAfterClone(
  thread: { readonly environmentId: EnvironmentId; readonly id: ThreadId },
  project: { readonly environmentId: EnvironmentId; readonly projectId: ProjectId },
): void {
  void waitForClone(project.environmentId, project.projectId).then((clone) => {
    if (clone === null) return;
    if (project.environmentId === thread.environmentId) {
      void moveThreadToProject(thread, project.projectId);
    } else if (rootNavigationRef.isReady()) {
      rootNavigationRef.navigate("ThreadMove", {
        environmentId: thread.environmentId,
        threadId: thread.id,
        targetEnvironmentId: project.environmentId,
        projectId: project.projectId,
      });
    }
  });
}
