import { Link, NavLinkProps, useMatch, useResolvedPath } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  (
    {
      className,
      activeClassName,
      pendingClassName,
      to,
      end,
      caseSensitive,
      ...props
    },
    ref,
  ) => {
    const resolved = useResolvedPath(to);
    const match = useMatch({
      path: resolved.pathname,
      end,
      caseSensitive,
    });

    const isActive = Boolean(match);
    // `isPending` só existe no NavLink de Data Router; aqui mantemos compatibilidade de API.
    const isPending = false;

    return (
      <Link
        ref={ref}
        to={to}
        className={cn(className, isActive && activeClassName, isPending && pendingClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
