import { createBrowserRouter } from "react-router"
import { AppLayout } from "@/components/layout/AppLayout"
import { AccountBriefsPage } from "@/pages/AccountBriefsPage"
import { CompanyResearchPage } from "@/pages/CompanyResearchPage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { OverviewPage } from "@/pages/OverviewPage"
import { SavedCompaniesPage } from "@/pages/SavedCompaniesPage"
import { SettingsPage } from "@/pages/SettingsPage"

/** Route paths must match `config/navigation.ts`. */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: "research", element: <CompanyResearchPage /> },
      { path: "companies", element: <SavedCompaniesPage /> },
      { path: "briefs", element: <AccountBriefsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
