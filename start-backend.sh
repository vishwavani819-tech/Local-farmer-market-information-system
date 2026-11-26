#!/usr/bin/env bash
# Runs the Spring Boot API on http://localhost:8080 using the bundled JDK and Maven.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JDK="$ROOT/.tools/jdk-21.0.13+9"
MVN="$ROOT/.tools/apache-maven-3.9.16/bin/mvn.cmd"

if [ -x "$JDK/bin/java.exe" ] && [ -f "$MVN" ]; then
  export JAVA_HOME="$(cygpath -w "$JDK")"
  cd "$ROOT/backend"
  exec "$MVN" -B spring-boot:run
fi

echo "Bundled toolchain not found — using system Java/Maven."
cd "$ROOT/backend"
exec mvn spring-boot:run
