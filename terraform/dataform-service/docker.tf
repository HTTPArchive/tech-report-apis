terraform {
  required_providers {
    docker = {
      source = "kreuzwerker/docker"
    }
  }
}

# Calculate hash of source files using git (respects .gitignore)
data "external" "source_hash" {
  program = [
    "bash",
    "-c",
    "cd ${var.source_directory} && echo '{\"hash\":\"'$(git ls-files -s apps/dataform-service packages/shared | sha1sum | cut -c1-8)'\"}'"
  ]
}

# Build Docker image
resource "docker_image" "function_image" {
  # hash added to image tag to force rebuilds and service image updates when source changes
  name = "${var.region}-docker.pkg.dev/${var.project}/${var.artifact_registry_repository_name}/${var.function_name}:${data.external.source_hash.result.hash}"

  build {
    context    = var.source_directory
    dockerfile = "apps/dataform-service/Dockerfile"
    platform   = "linux/amd64"
  }
}

resource "docker_registry_image" "registry_image" {
  name = docker_image.function_image.name
}
