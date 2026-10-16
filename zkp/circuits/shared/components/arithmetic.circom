pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

/**
 * Number of bits needed to represent n, i.e. ceil(log2(n + 1))
 */
function bitLength(n) {
    var length = 0;
    while (n > 0) {
        length++;
        n >>= 1;
    }
    return length;
}

/**
 * Integer division with remainder, with both results range-checked so the
 * decomposition dividend = quotient * divisor + remainder is unique.
 *
 * @param quotientBits - Upper bound on the quotient's bit length
 * @param divisorBits - Upper bound on the divisor's bit length (divisor < 2^divisorBits is the caller's responsibility)
 *
 * Example: Integer division with remainder
 *  signal quotient, remainder;
 *  (quotient,remainder) <== Divide(8,8)(17,5);
 *  quotient === 3;
 *  remainder === 2;
 */
template Divide(quotientBits, divisorBits) {
    // quotient * divisor + remainder < 2^(quotientBits + divisorBits + 1) must not wrap the field
    assert(quotientBits + divisorBits < 253);

    signal input dividend;
    signal input divisor;
    signal output quotient;
    signal output remainder;

    quotient <-- dividend \ divisor;
    remainder <-- dividend % divisor;

    _ = Num2Bits(quotientBits)(quotient);
    _ = Num2Bits(divisorBits)(remainder);
    signal isRemainderSmaller <== LessThan(divisorBits)([remainder, divisor]);
    isRemainderSmaller === 1;

    dividend === quotient * divisor + remainder;
}

/**
 * Mathematical operation: c[i] = a[i] × b[i] for all i in [0, n-1]
 * 
 * @param n - The length of the input and output arrays
 *
 * Example: Element-wise array multiplication
 *  signal products[4] = MultiplyTwoArray(4)([2, 3, 4, 5],[10, 20, 30, 40]);
 *  Results: [20, 60, 120, 200];
 */
template MultiplyTwoArray(n) {
    signal input a[n];
    signal input b[n];
    signal output c[n];

    for (var i = 0; i < n; i++) {
        c[i] <== a[i] * b[i];
    }
}


/**
 * Mathematical operation: out = in[0] + in[1] + in[2] + ... + in[n-1]
 * 
 * @param n - The number of input signals to sum (must be > 2)
 * 
 * Example: Adding 4 numbers
 *  signal result <== Adder(4)([10, 20, 30, 40]);
 *  result === 100;
 */
template Sum(n) {
    assert(n > 2);
    signal input in[n];
    signal output out;

    signal sum[n - 1];
    sum[0] <== in[0] + in[1];

    for (var i = 1; i < n - 1; i++) {
        sum[i] <== sum[i - 1] + in[i + 1];
    }

    out <== sum[n - 2];
}

/**
* @param maxIn - Upper bound on the input; costs bitLength(maxIn) constraints
* @param in - The input number to check parity for
* @return out - The result: 0 if even, 1 if odd
* 
* Example:
*  signal parity <== Mod2(11)(7);   // Returns 1 (odd)
*  signal parity <== Mod2(11)(8);   // Returns 0 (even)
*/
template Mod2(maxIn) {
    assert(maxIn > 0);
    signal input in;
    signal output {bit} out;

    // Full binary decomposition: a bare in === 2 * quotient + out would let
    // quotient wrap the field and accept either parity
    var numBits = bitLength(maxIn);
    signal bits[numBits] <== Num2Bits(numBits)(in);

    out <== bits[0];
}