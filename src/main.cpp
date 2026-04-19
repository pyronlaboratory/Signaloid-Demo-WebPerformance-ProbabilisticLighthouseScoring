#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <string>
#include <vector>
#include <uxhw.h>

static constexpr double kWeightFCP = 0.10;
static constexpr double kWeightLCP = 0.25;
static constexpr double kWeightTBT = 0.30;
static constexpr double kWeightCLS = 0.25;
static constexpr double kWeightSI  = 0.10;

static constexpr double kGoodThreshold = 90.0;

static std::vector<double> loadSamples(const std::string& path)
{
    std::ifstream file(path);
    if (!file)
    {
        fprintf(stderr, "Error: cannot open %s\n", path.c_str());
        exit(EXIT_FAILURE);
    }

    int count = 0;
    file >> count;

    std::vector<double> buf(count);
    for (auto& val : buf)
    {
        file >> val;
    }

    return buf;
}

int main()
{
    auto fcp_s = loadSamples("sd0/inputs/fcp.txt");
    auto lcp_s = loadSamples("sd0/inputs/lcp.txt");
    auto tbt_s = loadSamples("sd0/inputs/tbt.txt");
    auto cls_s = loadSamples("sd0/inputs/cls.txt");
    auto si_s  = loadSamples("sd0/inputs/si.txt");

    const int n = static_cast<int>(fcp_s.size());
    printf("Loaded %d Lighthouse runs per metric.\n\n", n);

    double fcp = UxHwDoubleDistFromSamples(fcp_s.data(), n);
    double lcp = UxHwDoubleDistFromSamples(lcp_s.data(), n);
    double tbt = UxHwDoubleDistFromSamples(tbt_s.data(), n);
    double cls = UxHwDoubleDistFromSamples(cls_s.data(), n);
    double si  = UxHwDoubleDistFromSamples(si_s.data(),  n);

    double score = kWeightFCP * fcp
                 + kWeightLCP * lcp
                 + kWeightTBT * tbt
                 + kWeightCLS * cls
                 + kWeightSI  * si;

    double margin = score - kGoodThreshold;
    double p_fail = 1.0 - UxHwDoubleProbabilityGT(score, kGoodThreshold);

    printf("--- Lighthouse Score Distribution ---\n");
    printf("Composite score (0–100):   %lf\n", score);
    printf("Margin vs 'Good' (90):     %lf\n", margin);
    printf("P(score < 90):             %lf\n\n", p_fail);

    printf("--- Per-Metric Distributions ---\n");
    printf("FCP  (weight 10%%): %lf\n", fcp);
    printf("LCP  (weight 25%%): %lf\n", lcp);
    printf("TBT  (weight 30%%): %lf\n", tbt);
    printf("CLS  (weight 25%%): %lf\n", cls);
    printf("SI   (weight 10%%): %lf\n", si);

    return 0;
}