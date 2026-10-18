#!/usr/bin/env bash
# Compare Groth16 proving time of SBox vs SBoxOptimized by batching N lookups
# per circuit, so fixed snarkjs overhead (node startup, zkey load) is visible
# as the intercept rather than drowning out the per-SBox cost.
#
# Usage: bench/sboxProving.sh [RUNS] [N ...]   (run from zkp/)
#   bench/sboxProving.sh 5 256 1024 4096
set -euo pipefail

RUNS=${1:-5}
shift || true
if [[ $# -gt 0 ]]; then SIZES=("$@"); else SIZES=(256 1024 4096); fi

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/bench/build"
PTAU="$ROOT/circuits/shared/keys/downloaded/ppot_0080_final_23.ptau"
RESULTS="$OUT/results.csv"

[[ -f "$PTAU" ]] || { echo "Powers of Tau not found: $PTAU" >&2; exit 1; }
mkdir -p "$OUT"
echo "variant,n,constraints,run,prove_ms" > "$RESULTS"

now_ms() { perl -MTime::HiRes=time -e 'printf "%d\n", time * 1000'; }

write_circuit() {
  local name=$1 n=$2 optimized=$3 dir=$4
  cat > "$dir/$name.circom" <<EOF
pragma circom 2.2.2;
include "$ROOT/circuits/shared/components/aesGcm/encryptBlock.circom";

template Bench(N, OPTIMIZED) {
    signal input in[N];
    signal output out[N];
    signal {byte} b[N];

    for (var i = 0; i < N; i++) {
        b[i] <== in[i];
        if (OPTIMIZED == 1) {
            out[i] <== SBoxOptimized()(b[i]);
        } else {
            out[i] <== SBox()(b[i]);
        }
    }
}

component main = Bench($n, $optimized);
EOF
  node -e "console.log(JSON.stringify({in: Array.from({length: $n}, () => Math.floor(Math.random() * 256))}))" \
    > "$dir/input.json"
}

prepare() {
  local name=$1 dir=$2
  circom "$dir/$name.circom" --r1cs --wasm -l "$ROOT/node_modules" --O2 --output "$dir" > /dev/null
  snarkjs wtns calculate "$dir/${name}_js/$name.wasm" "$dir/input.json" "$dir/witness.wtns"
  NODE_OPTIONS=--max-old-space-size=16384 snarkjs groth16 setup "$dir/$name.r1cs" "$PTAU" "$dir/$name.zkey" > /dev/null
}

constraint_count() {
  snarkjs r1cs info "$1" | sed -nE 's/.*# of Constraints: ([0-9]+).*/\1/p'
}

for n in "${SIZES[@]}"; do
  for variant in SBox SBoxOptimized; do
    optimized=$([[ $variant == SBoxOptimized ]] && echo 1 || echo 0)
    name="bench${variant}_$n"
    dir="$OUT/$name"
    mkdir -p "$dir"

    echo "== $variant N=$n: compile + setup"
    write_circuit "$name" "$n" "$optimized" "$dir"
    prepare "$name" "$dir"
    constraints=$(constraint_count "$dir/$name.r1cs")

    for run in $(seq 1 "$RUNS"); do
      start=$(now_ms)
      snarkjs groth16 prove "$dir/$name.zkey" "$dir/witness.wtns" "$dir/proof.json" "$dir/public.json"
      elapsed=$(( $(now_ms) - start ))
      echo "$variant,$n,$constraints,$run,$elapsed" >> "$RESULTS"
      echo "   run $run: ${elapsed} ms"
    done
  done
done

echo
echo "Results written to $RESULTS"
