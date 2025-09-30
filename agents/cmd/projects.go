/*
Copyright © 2023 shalomb <s.bhooshi@gmail.com>
*/
package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"github.com/spf13/cobra"
)

// projectsCmd represents the projects command
var projectsCmd = &cobra.Command{
	Use:   "projects",
	Short: "List Git projects from configured directories",
	Long: `Scan configured directories for Git repositories and list them with their
remote URLs or current branch information. This replaces the shell script
projects-list with better performance and Go-native implementation.`,

	Run: func(cmd *cobra.Command, args []string) {
		doListProjects()
	},
}

func init() {
	rootCmd.AddCommand(projectsCmd)

	// Add flags for different output formats
	projectsCmd.Flags().BoolP("update", "u", false, "Force update of project cache")
	projectsCmd.Flags().StringP("format", "f", "default", "Output format: default, fzf, json")
}

type Project struct {
	Path   string
	Remote string
	Branch string
}

func doListProjects() {
	// Get project directories from config
	projectDirs := getProjectDirs()
	
	// Find all Git repositories
	projects := findGitProjects(projectDirs)
	
	// Sort projects by path
	sort.Slice(projects, func(i, j int) bool {
		return projects[i].Path < projects[j].Path
	})
	
	// Output projects
	for _, project := range projects {
		if project.Remote != "" {
			fmt.Printf("%s\t%s\n", project.Path, project.Remote)
		} else {
			fmt.Printf("%s\t%s\n", project.Path, project.Branch)
		}
	}
}

func getProjectDirs() []string {
	// Default project directories
	dirs := []string{
		filepath.Join(os.Getenv("HOME"), "projects"),
	}
	
	// Read from projects-dirs.list if it exists
	configDir := os.Getenv("XDG_CONFIG_HOME")
	if configDir == "" {
		configDir = filepath.Join(os.Getenv("HOME"), ".config")
	}
	
	projectsDirsList := filepath.Join(configDir, "projects-dirs.list")
	if data, err := os.ReadFile(projectsDirsList); err == nil {
		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" && !strings.HasPrefix(line, "#") {
				// Expand ~ to home directory
				if strings.HasPrefix(line, "~/") {
					line = filepath.Join(os.Getenv("HOME"), line[2:])
				}
				dirs = append(dirs, line)
			}
		}
	}
	
	// Remove duplicates
	seen := make(map[string]bool)
	var uniqueDirs []string
	for _, dir := range dirs {
		if !seen[dir] {
			seen[dir] = true
			uniqueDirs = append(uniqueDirs, dir)
		}
	}
	
	return uniqueDirs
}

func findGitProjects(dirs []string) []Project {
	var projects []Project
	
	for _, dir := range dirs {
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			continue
		}
		
		// Find all .git directories
		err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil // Skip errors, continue walking
			}
			
			if info.IsDir() && info.Name() == ".git" {
				projectDir := filepath.Dir(path)
				project := getProjectInfo(projectDir)
				if project.Path != "" {
					projects = append(projects, project)
				}
				return filepath.SkipDir // Don't recurse into .git
			}
			
			return nil
		})
		
		if err != nil {
			continue
		}
	}
	
	return projects
}

func getProjectInfo(projectDir string) Project {
	// Convert absolute path to ~ notation
	home := os.Getenv("HOME")
	var displayPath string
	if strings.HasPrefix(projectDir, home) {
		displayPath = "~" + projectDir[len(home):]
	} else {
		displayPath = projectDir
	}
	
	project := Project{Path: displayPath}
	
	// Get Git remote information
	if remotes := getGitRemotes(projectDir); len(remotes) > 0 {
		project.Remote = remotes[0] // Use first remote
	} else {
		// No remotes, get current branch
		if branch := getCurrentBranch(projectDir); branch != "" {
			project.Branch = branch
		} else {
			project.Branch = "main" // Default branch
		}
	}
	
	return project
}

func getGitRemotes(projectDir string) []string {
	cmd := exec.Command("git", "remote", "-v")
	cmd.Dir = projectDir
	output, err := cmd.Output()
	if err != nil {
		return nil
	}
	
	var remotes []string
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) >= 2 && fields[2] == "(fetch)" {
			remotes = append(remotes, fields[1])
		}
	}
	
	return remotes
}

func getCurrentBranch(projectDir string) string {
	cmd := exec.Command("git", "branch", "--show-current")
	cmd.Dir = projectDir
	output, err := cmd.Output()
	if err != nil {
		return ""
	}
	
	return strings.TrimSpace(string(output))
}