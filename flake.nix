{
  description = "v0-clone";
  inputs.cc-setup.url = "github:stussysenik/cc-setup";
  outputs = { self, cc-setup, ... }:
    cc-setup.inputs.flake-utils.lib.eachDefaultSystem (system: {
      devShells.default = cc-setup.devShells.${system}.web;
    });
}
