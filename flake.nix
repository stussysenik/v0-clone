{
  description = "v0-clone: Frontend generation engine with real-time preview";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # ══════════════════════════════════════════════════════════════════
        # CORE: Always included
        # ══════════════════════════════════════════════════════════════════
        corePkgs = with pkgs; [
          # Session & Terminal
          tmux
          direnv
          nix-direnv

          # CLI Improvements
          bat
          eza
          fd
          ripgrep
          fzf
          zoxide
          jq
          delta
          lazygit

          # Task Running
          just
          watchexec

          # Security
          gitleaks

          # Infrastructure
          gh
          git
        ];

        # ══════════════════════════════════════════════════════════════════
        # WEB: Phase 1 stack
        # ══════════════════════════════════════════════════════════════════
        webPkgs = with pkgs; [
          nodejs_22
          bun
          nodePackages.typescript
          biome
        ];

        # ══════════════════════════════════════════════════════════════════
        # ELIXIR: Phase 2 prep (Phoenix backend)
        # ══════════════════════════════════════════════════════════════════
        elixirPkgs = with pkgs; [
          elixir
          erlang
        ];

        # ══════════════════════════════════════════════════════════════════
        # LISP: Phase 2 prep (Prompt DSL)
        # ══════════════════════════════════════════════════════════════════
        lispPkgs = with pkgs; [
          sbcl
        ];

        # ══════════════════════════════════════════════════════════════════
        # SHELL HOOK
        # ══════════════════════════════════════════════════════════════════
        commonShellHook = ''
          # ─── Environment ───
          eval "$(direnv hook bash 2>/dev/null || direnv hook zsh 2>/dev/null || true)"
          eval "$(zoxide init bash 2>/dev/null || zoxide init zsh 2>/dev/null || true)"
          eval "$(fzf --bash 2>/dev/null || fzf --zsh 2>/dev/null || true)"

          # ─── Aliases ───
          alias ll='eza -la --icons --git'
          alias la='eza -a --icons'
          alias lg='lazygit'
          alias gd='git diff | delta'

          # ═══════════════════════════════════════════════════════════════
          # CLAUDE FUNCTIONS
          # ═══════════════════════════════════════════════════════════════

          cc() { claude "$@"; }

          # cct: Claude in tmux (persistent session!)
          cct() {
            local name="''${1:-v0clone}"
            if tmux has-session -t "$name" 2>/dev/null; then
              tmux attach -t "$name"
            else
              tmux new-session -s "$name" "claude"
            fi
          }

          # ═══════════════════════════════════════════════════════════════
          # VERIFICATION
          # ═══════════════════════════════════════════════════════════════

          verify() {
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "▶ VERIFY: Running all checks..."
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            local failed=0

            echo ""
            echo "▶ Format check..."
            biome format --check . || failed=1

            echo ""
            echo "▶ Lint..."
            biome lint . || failed=1

            echo ""
            echo "▶ Type check..."
            if [[ -f tsconfig.json ]]; then
              npx tsc --noEmit || failed=1
            fi

            echo ""
            echo "▶ Build..."
            if grep -q '"build"' package.json 2>/dev/null; then
              bun run build || failed=1
            fi

            echo ""
            echo "▶ Security (secret detection)..."
            gitleaks detect --source . --no-git || failed=1

            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            if [[ $failed -eq 0 ]]; then
              echo "✅ VERIFIED - All checks passed"
              return 0
            else
              echo "❌ VERIFICATION FAILED"
              return 1
            fi
          }

          fmt() {
            biome format --write .
            biome lint --apply .
          }

          # ─── Welcome ───
          echo ""
          echo "╭─────────────────────────────────────────────────────────────────╮"
          echo "│  v0-clone                                                       │"
          echo "├─────────────────────────────────────────────────────────────────┤"
          echo "│  cc          Start Claude        verify    Check everything     │"
          echo "│  cct         Claude in tmux      fmt       Auto-fix formatting  │"
          echo "│                                                                 │"
          echo "│  bun dev:studio    Start dev server                             │"
          echo "╰─────────────────────────────────────────────────────────────────╯"
          echo ""
        '';

      in {
        devShells = {
          # Default: Web development (Phase 1)
          default = pkgs.mkShell {
            packages = corePkgs ++ webPkgs;
            shellHook = commonShellHook;
          };

          # Full: Includes Phase 2 prep (Elixir, Lisp)
          full = pkgs.mkShell {
            packages = corePkgs ++ webPkgs ++ elixirPkgs ++ lispPkgs;
            shellHook = commonShellHook + ''
              echo "🧪 Full shell: Elixir + SBCL ready for Phase 2"
            '';
          };
        };
      });
}
