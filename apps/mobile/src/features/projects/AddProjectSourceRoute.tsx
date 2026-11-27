import type { StaticScreenProps } from "@react-navigation/native";
import { AddProjectSourceScreen } from "./AddProjectScreen";

type AddProjectSourceRouteParams = {
  readonly environmentId?: string | string[];
  /** A thread in `environmentId` that moves into the project this flow adds. */
  readonly moveThreadId?: string;
};

export function AddProjectSourceRoute({
  route,
}: StaticScreenProps<AddProjectSourceRouteParams | undefined>) {
  return <AddProjectSourceScreen {...(route.params ?? {})} />;
}
