import cv2
import numpy as np

from sklearn.base import BaseEstimator, TransformerMixin


class ImageReader(BaseEstimator, TransformerMixin):

    def fit(self, x, y=None):
        return self

    def transform(self, files):
        return [
            cv2.imread(f) for f in files
        ]


class ImageScaler(BaseEstimator, TransformerMixin):

    def __init__(self, w = 24, h = 24):
        self.width = w
        self.height = h

    def fit(self, x, y=None):
        return self

    def transform(self, images):
        return [
            cv2.resize(im, (self.width, self.height)) for im in images
        ]


class FeaturesExtractor(BaseEstimator, TransformerMixin):

    def fit(self, x, y=None):
        return self

    def extract(self, im):
        raise NotImplementedError()

    def transform(self, images):
        return np.array([
            self.extract(im) for im in images
        ])


class GaborEnergyExtractor(FeaturesExtractor):

    def __init__(self, ksize=24):
        self.filters = []
        sigma = 4.0
        phase = 0.0
        for theta in np.arange(0, np.pi, np.pi / 4):
            for lambd in np.arange(0.5, 10.0, 3.0):
                kern = cv2.getGaborKernel((ksize, ksize),
                                            sigma, theta, lambd,
                                            phase, 0, ktype=cv2.CV_32F)
                self.filters.append(kern)

    def extract(self, im):
        im = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
        im = im.astype(np.float32)/255.0
        feats = np.zeros(len(self.filters))
        for i, kern in enumerate(self.filters):
            fimg = cv2.filter2D(im, cv2.CV_32F, kern)
            feats[i] = np.sum(np.power(fimg, 2))
        return feats


from skimage.feature import hog, local_binary_pattern


class LbpExtractor(FeaturesExtractor):

    def extract(self, im):
        im = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
        lbp = local_binary_pattern(im, 8, 2, method='uniform')
        return lbp.ravel()


class HogExtractor(FeaturesExtractor):

    def extract(self, im):
        return hog(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY))


class HistExtractor(FeaturesExtractor):

    def extract(self, im):
        _,__,c = im.shape
        return np.concatenate(
          [np.histogram(im[:,:,i], bins=10, range=(0,255))[0] for i in range(c)]
        )


class PercentilesExtractor(FeaturesExtractor):

    def extract(self, im):
        _,__,c = im.shape
        percentiles = [10, 20, 30, 40, 50, 60, 70, 80, 90]
        return np.concatenate(
            [np.percentile(im[:,:,i], percentiles) for i in range(c)]
        )


from gist import extract as gist_features

class GistExtractor(FeaturesExtractor):

    def extract(self, im):
        return gist_features(im)


class OuluExtractor(FeaturesExtractor):

    def get_stats(self, hist, add):
        mean = 0
        mode = 0
        sum = 0
        maxVal = 0
        for i, h in enumerate(hist):
            mean += i * h
            sum += h
            if h > maxVal:
                maxVal = h
                mode = i

        median = 0
        sum /= 2.0
        tmp = 0
        for i, h in enumerate(hist):
            tmp += h
            if tmp >= sum:
                median = i
                break

        mean += add
        mode += add
        median += add

        return np.array([mean, mode, median])

    def otsu_features(self, im):
        otsu_th,_ = cv2.threshold(im,0,255,cv2.THRESH_BINARY+cv2.THRESH_OTSU)
        hist,_ = np.histogram(im, bins=256, range=(0,255), normed=True)
        left_hist = hist[:otsu_th]
        right_hist = hist[otsu_th:]
        return np.concatenate([self.get_stats(left_hist, 0),
                         self.get_stats(right_hist, otsu_th)])

    def extract(self, im):
        _,__,c = im.shape
        return np.concatenate(
            [self.otsu_features(im[:,:,i]) for i in range(c)]
        )



class FeaturesSaver(FeaturesExtractor):

    def __init__(self, filename):
        self.filename = filename

    def transform(self, data):
        np.savetxt(self.filename, data)
        return data


import os

class FeaturesCache(FeaturesExtractor):

    def __init__(self, key, pipeline=[]):
        self.key = key
        self.pipeline = pipeline

    def process_directory(self, directory):
        if self.pipeline:
            return self.pipeline.transform([directory])

    def load_from_directory(self, directory):
        fname = os.path.join(directory, self.key)
        if os.path.exists(fname):
            return np.loadtxt(fname)
        return self.process_directory(directory)

    def transform(self, directories):
        return np.concatenate(
            [self.load_from_directory(d) for d in directories]
        )


