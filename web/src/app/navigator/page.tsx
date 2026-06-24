import { Suspense } from "react";
import { Spinner } from "@patternfly/react-core";
import { PracticeNavigatorClient } from "./PracticeNavigatorClient";

export default function NavigatorPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
          }}
        >
          <Spinner aria-label="Loading practice navigator" />
        </div>
      }
    >
      <PracticeNavigatorClient />
    </Suspense>
  );
}
