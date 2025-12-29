import { Link, To, useMatch, useResolvedPath } from "react-router-dom";
import { forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps {
  to: To;
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  end?: boolean;
  caseSensitive?: boolean;
  children?: ReactNode;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
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
      children,
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
    const isPending = false;

    return (
      <Link
        ref={ref}
        to={to}
        className={cn(className, isActive && activeClassName, isPending && pendingClassName)}
        {...props}
      >
        {children}
      </Link>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
