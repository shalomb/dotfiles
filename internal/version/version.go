package version

import (
	"fmt"
	"runtime"
)

// Version information
var (
	// Version is the semantic version (set at build time)
	Version = "dev"
	
	// Commit is the git commit hash (set at build time)
	Commit = "unknown"
	
	// BuildDate is the build timestamp (set at build time)
	BuildDate = "unknown"
	
	// GoVersion is the Go version used to build
	GoVersion = runtime.Version()
)

// GetVersion returns a formatted version string
func GetVersion() string {
	if Version == "dev" {
		return fmt.Sprintf("tmuxie %s (%s)", Version, Commit)
	}
	return fmt.Sprintf("tmuxie %s (%s)", Version, Commit)
}

// GetFullVersion returns detailed version information
func GetFullVersion() string {
	return fmt.Sprintf(`tmuxie %s
Commit: %s
Build Date: %s
Go Version: %s
OS/Arch: %s/%s`,
		Version, Commit, BuildDate, GoVersion, runtime.GOOS, runtime.GOARCH)
}