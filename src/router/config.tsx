import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/login/page";
import Pdv from "@/pages/pdv/page";
import Balcao from "@/pages/balcao/page";
import Estoque from "@/pages/estoque/page";
import Comandas from "@/pages/comandas/page";
import AppLayout from "@/components/feature/AppLayout";
import { RequireAuth } from "@/components/feature/RouteGuards";

const routes: RouteObject[] = [
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/pdv" replace />,
      },
      {
        path: "pdv",
        element: <Pdv />,
      },
      {
        path: "balcao",
        element: <Balcao />,
      },
      {
        path: "estoque",
        element: <Estoque />,
      },
      {
        path: "comandas",
        element: <Comandas />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
];

export default routes;